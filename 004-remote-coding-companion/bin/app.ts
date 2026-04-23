#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { RemoteCodingCompanionStack } from "../lib/remote-coding-companion-stack";

const app = new cdk.App();

// Leave env unset to deploy into the CLI's current account + region.
// Pin explicitly if you want deterministic deploys:
//   env: { account: "123456789012", region: "us-east-1" }
new RemoteCodingCompanionStack(app, "RemoteCodingCompanionStack", {
  description: "Remote coding companion — minimal EC2 + SSM + tmux + Claude Code.",
});
