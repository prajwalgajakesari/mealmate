#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/network-stack';
import { DatabaseStack } from '../lib/database-stack';
import { EcsStack } from '../lib/ecs-stack';
import { MonitoringStack } from '../lib/monitoring-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'ap-south-1',
};

const network = new NetworkStack(app, 'MealMate-Network', { env });

const database = new DatabaseStack(app, 'MealMate-Database', {
  env,
  vpc: network.vpc,
});

const ecs = new EcsStack(app, 'MealMate-ECS', {
  env,
  vpc: network.vpc,
  database: database.database,
  redis: database.redis,
});

new MonitoringStack(app, 'MealMate-Monitoring', {
  env,
  cluster: ecs.cluster,
  services: ecs.services,
});
