import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

interface ServiceConfig {
  name: string;
  path: string;
  port: number;
  cpu: number;
  memory: number;
  desiredCount: number;
  healthCheckPath: string;
  environment?: Record<string, string>;
}

interface EcsStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  database: rds.DatabaseInstance;
  redis: elasticache.CfnCacheCluster;
}

export class EcsStack extends cdk.Stack {
  public readonly cluster: ecs.Cluster;
  public readonly services: ecs.FargateService[] = [];

  constructor(scope: Construct, id: string, props: EcsStackProps) {
    super(scope, id, props);

    const { vpc, database, redis } = props;

    // ECS Cluster
    this.cluster = new ecs.Cluster(this, 'MealMateCluster', {
      vpc,
      clusterName: 'mealmate',
      containerInsights: true,
    });

    // ALB
    const alb = new elbv2.ApplicationLoadBalancer(this, 'MealMateALB', {
      vpc,
      internetFacing: true,
    });

    const listener = alb.addListener('HttpListener', {
      port: 80,
      defaultAction: elbv2.ListenerAction.fixedResponse(404, {
        contentType: 'text/plain',
        messageBody: 'Not Found',
      }),
    });

    // Service security group
    const serviceSecurityGroup = new ec2.SecurityGroup(this, 'ServiceSG', {
      vpc,
      description: 'Security group for ECS services',
    });

    // Allow services to access DB and Redis
    database.connections.allowFrom(serviceSecurityGroup, ec2.Port.tcp(5432));

    const dbUrl = `postgresql://mealmate:${database.secret?.secretValueFromJson('password').unsafeUnwrap()}@${database.dbInstanceEndpointAddress}:5432/mealmate`;
    const redisUrl = `redis://${redis.attrRedisEndpointAddress}:${redis.attrRedisEndpointPort}`;

    // Service definitions
    const serviceConfigs: ServiceConfig[] = [
      {
        name: 'meal-engine',
        path: 'services/meal-engine',
        port: 8000,
        cpu: 512,
        memory: 1024,
        desiredCount: 2,
        healthCheckPath: '/health',
      },
      {
        name: 'pantry-tracker',
        path: 'services/pantry-tracker',
        port: 8000,
        cpu: 256,
        memory: 512,
        desiredCount: 1,
        healthCheckPath: '/health',
      },
      {
        name: 'order-orchestrator',
        path: 'services/order-orchestrator',
        port: 3000,
        cpu: 512,
        memory: 1024,
        desiredCount: 2,
        healthCheckPath: '/health',
      },
      {
        name: 'user-service',
        path: 'services/user-service',
        port: 3000,
        cpu: 256,
        memory: 512,
        desiredCount: 1,
        healthCheckPath: '/health',
      },
      {
        name: 'whatsapp-bot',
        path: 'apps/whatsapp-bot',
        port: 3000,
        cpu: 256,
        memory: 512,
        desiredCount: 1,
        healthCheckPath: '/health',
      },
    ];

    for (const config of serviceConfigs) {
      const taskDef = new ecs.FargateTaskDefinition(
        this,
        `${config.name}-task`,
        {
          cpu: config.cpu,
          memoryLimitMiB: config.memory,
        }
      );

      const logGroup = new logs.LogGroup(this, `${config.name}-logs`, {
        logGroupName: `/mealmate/${config.name}`,
        retention: logs.RetentionDays.TWO_WEEKS,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });

      taskDef.addContainer(`${config.name}-container`, {
        image: ecs.ContainerImage.fromAsset(config.path),
        portMappings: [{ containerPort: config.port }],
        environment: {
          DATABASE_URL: dbUrl,
          REDIS_URL: redisUrl,
          NODE_ENV: 'production',
          ...config.environment,
        },
        logging: ecs.LogDrivers.awsLogs({
          logGroup,
          streamPrefix: config.name,
        }),
        healthCheck: {
          command: [
            'CMD-SHELL',
            `curl -f http://localhost:${config.port}${config.healthCheckPath} || exit 1`,
          ],
          interval: cdk.Duration.seconds(30),
          timeout: cdk.Duration.seconds(5),
          retries: 3,
        },
      });

      const service = new ecs.FargateService(
        this,
        `${config.name}-service`,
        {
          cluster: this.cluster,
          taskDefinition: taskDef,
          desiredCount: config.desiredCount,
          securityGroups: [serviceSecurityGroup],
          vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        }
      );

      // Auto-scaling
      const scaling = service.autoScaleTaskCount({
        minCapacity: config.desiredCount,
        maxCapacity: config.desiredCount * 3,
      });
      scaling.scaleOnCpuUtilization(`${config.name}-cpu-scaling`, {
        targetUtilizationPercent: 60,
        scaleInCooldown: cdk.Duration.seconds(60),
        scaleOutCooldown: cdk.Duration.seconds(60),
      });

      // ALB target group
      const targetGroup = listener.addTargets(`${config.name}-target`, {
        port: config.port,
        targets: [service],
        healthCheck: {
          path: config.healthCheckPath,
          interval: cdk.Duration.seconds(30),
        },
        conditions: [
          elbv2.ListenerCondition.pathPatterns([
            config.name === 'meal-engine'
              ? '/api/v1/plans/*'
              : config.name === 'pantry-tracker'
                ? '/api/v1/pantry/*'
                : config.name === 'order-orchestrator'
                  ? '/api/v1/orders/*'
                  : config.name === 'user-service'
                    ? '/api/v1/auth/*'
                    : '/api/v1/whatsapp/*',
          ]),
        ],
        priority: serviceConfigs.indexOf(config) + 1,
      });

      this.services.push(service);
    }

    new cdk.CfnOutput(this, 'ALBDnsName', {
      value: alb.loadBalancerDnsName,
    });
  }
}
