#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { AgentRuntimeStack } from "../lib/agent-runtime-stack";

const app = new cdk.App();

// Leave env unset to deploy into the CLI's current account + region.
// Pin explicitly if you want deterministic deploys:
//   env: { account: "123456789012", region: "us-east-1" }
new AgentRuntimeStack(app, "AgentRuntimeStack", {
  description: "Hardened EC2 runtime for autonomous processes. SSM-only access, no SSH.",
});
