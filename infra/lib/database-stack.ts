import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import { Construct } from 'constructs';

interface DatabaseStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
}

export class DatabaseStack extends cdk.Stack {
  public readonly database: rds.DatabaseInstance;
  public readonly redis: elasticache.CfnCacheCluster;
  public readonly dbSecurityGroup: ec2.SecurityGroup;
  public readonly redisSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const { vpc } = props;

    // Security Groups
    this.dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
      vpc,
      description: 'Security group for MealMate RDS',
      allowAllOutbound: false,
    });

    this.redisSecurityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
      vpc,
      description: 'Security group for MealMate Redis',
      allowAllOutbound: false,
    });

    // PostgreSQL RDS
    this.database = new rds.DatabaseInstance(this, 'MealMateDB', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MEDIUM
      ),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [this.dbSecurityGroup],
      databaseName: 'mealmate',
      credentials: rds.Credentials.fromGeneratedSecret('mealmate', {
        secretName: 'mealmate/db-credentials',
      }),
      multiAz: false,
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      storageEncrypted: true,
      backupRetention: cdk.Duration.days(7),
      deletionProtection: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ElastiCache Redis
    const redisSubnetGroup = new elasticache.CfnSubnetGroup(
      this,
      'RedisSubnetGroup',
      {
        description: 'MealMate Redis subnet group',
        subnetIds: vpc.selectSubnets({
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        }).subnetIds,
      }
    );

    this.redis = new elasticache.CfnCacheCluster(this, 'MealMateRedis', {
      engine: 'redis',
      cacheNodeType: 'cache.t4g.small',
      numCacheNodes: 1,
      vpcSecurityGroupIds: [this.redisSecurityGroup.securityGroupId],
      cacheSubnetGroupName: redisSubnetGroup.ref,
      engineVersion: '7.1',
    });

    // Outputs
    new cdk.CfnOutput(this, 'DbEndpoint', {
      value: this.database.dbInstanceEndpointAddress,
    });
    new cdk.CfnOutput(this, 'RedisEndpoint', {
      value: this.redis.attrRedisEndpointAddress,
    });
  }
}
