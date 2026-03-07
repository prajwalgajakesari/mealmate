import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Construct } from 'constructs';

interface MonitoringStackProps extends cdk.StackProps {
  cluster: ecs.Cluster;
  services: ecs.FargateService[];
}

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const { services } = props;

    // SNS Topic for alerts
    const alertTopic = new sns.Topic(this, 'MealMateAlerts', {
      topicName: 'mealmate-alerts',
    });

    // Dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'MealMateDashboard', {
      dashboardName: 'MealMate-Operations',
    });

    const serviceWidgets: cloudwatch.IWidget[] = [];

    for (const service of services) {
      const serviceName =
        service.node.id.replace('-service', '');

      // CPU alarm
      const cpuAlarm = new cloudwatch.Alarm(this, `${serviceName}-cpu-alarm`, {
        metric: service.metricCpuUtilization(),
        threshold: 80,
        evaluationPeriods: 3,
        alarmDescription: `${serviceName} CPU > 80% for 3 periods`,
      });
      cpuAlarm.addAlarmAction(new actions.SnsAction(alertTopic));

      // Memory alarm
      const memAlarm = new cloudwatch.Alarm(
        this,
        `${serviceName}-mem-alarm`,
        {
          metric: service.metricMemoryUtilization(),
          threshold: 85,
          evaluationPeriods: 3,
          alarmDescription: `${serviceName} Memory > 85% for 3 periods`,
        }
      );
      memAlarm.addAlarmAction(new actions.SnsAction(alertTopic));

      // Dashboard widgets
      serviceWidgets.push(
        new cloudwatch.GraphWidget({
          title: `${serviceName} - CPU & Memory`,
          left: [service.metricCpuUtilization()],
          right: [service.metricMemoryUtilization()],
          width: 12,
        })
      );
    }

    dashboard.addWidgets(...serviceWidgets);

    new cdk.CfnOutput(this, 'AlertTopicArn', {
      value: alertTopic.topicArn,
    });
  }
}
