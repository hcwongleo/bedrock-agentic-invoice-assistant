# Automated Loan Application

## Overview

This repository provides an automated loan application processing system that streamlines document submission, verification, underwriting and approval processes. The solution helps financial institutions reduce manual processing time, minimize errors, and provide better customer experience through AI-powered document processing and validation.

## Key Features

- Intelligent document upload and processing (PDF/Images)
- Automated data extraction from key documents
- Real-time document validation and verification
- Automated loan application form completion
- DTI calculation and pre-approval letter generation
- Interactive chatbot for loan process assistance

## Architecture

![Architecture Diagram](./packages/webapp/src/assets/architecture.png)

### Provisioned Resources

The system creates and manages:
- Bedrock data automation blueprints for data extraction
- Bedrock multi-agents for document verification, DTI calculation
- Secure document storage system
- Application form auto-completion
- Pre-approval letter generation
- Chatbot integration for applicant

## Demo Script

The demo script, use case, and persona is provided here: [Demo Script](/docs/demoscript/demo-script.md)

## Setup

### Prerequisites

1. AWS account with appropriate permissions
2. AWS CLI (v2.x or later)
3. For Linux/EC2 users, this application requires ARM architecture
4. [Install node and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm), node.js 22 is recommended
5. [Get started with CDK](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html), and [bootstrap your environment for use](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping-env.html)
6. [Install Docker](https://www.docker.com/get-started/), because we are bundling Lambda functions when running CDK so we need to install Docker. Please see the blog post about [Building, bundling and deploying applications with the AWS CDK](https://aws.amazon.com/blogs/devops/building-apps-with-aws-cdk/)
7. [Run aws configure](https://docs.aws.amazon.com/cli/latest/reference/configure/set.html) to set up region
```bash
aws configure set region YOUR_REGION
```
8. [Enable models in Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html), for this use case, you need to enable Anthropic Claude Sonnet 3.5 v2

### Quick Start

1. Clone this repository
2. Install npm modules
```bash
cd auto-loan-application
npm run install-packages
```
3. Deploy the backend and frontend
```bash
npm run deploy-all
```
To deploy the backend only
```bash
npm run deploy-backend
```
To deploy the frontend only
```bash
npm run deploy-frontend
```
4. Access to the application from [Cloudfront distribution URL](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/GettingStarted.SimpleDistribution.html)
5. [Create cognito user](https://docs.aws.amazon.com/cognito/latest/developerguide/how-to-create-user-accounts.html#creating-a-new-user-using-the-console) in the user pool to access the application
6. Delete the stack. We recommend using the AWS CloudFormation service page to delete/manage your CDK stacks as it offers many options to monitor stack drifts, identify errors, and provides better stability. Note: The deletion will fail if your S3 bucket is not empty, and the WAF stack will take longer to delete.

### FAQ
Q: Why isn't the review page showing the application list?

A: If you're not seeing the application list on the review page, try clicking the `Clear` Button to refresh the view. 
![](./packages/webapp/src/assets/faq_1.png)

Q: How can I clear my conversation history and terminate the current session?

A: We use `userId` to track conversation history. To clear the history and terminate the current session, simply click the `Clear Chat` button in the chat interface.

Q: Why are S3 buckets and CloudWatch logs still in my account?

A: The S3 buckets and CloudWatch log groups are intentionally retained in your account as a safety measure to prevent accidental data loss during stack removal. To completely remove these resources, you'll need to manually delete them through the AWS Console or AWS CLI - first empty the S3 bucket contents before deletion, and CloudWatch log groups can be deleted directly.
