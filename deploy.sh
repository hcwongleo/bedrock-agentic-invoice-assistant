#!/bin/bash

# Bedrock Agentic Invoice Assistant - Simple Deployment Script
# This script handles CDK bootstrap and application deployment

set -e  # Exit on any error

echo "🚀 Deploying Bedrock Agentic Invoice Assistant"
echo "=============================================="

# Check if CDK is bootstrapped, if not, bootstrap it
echo "📋 Checking CDK bootstrap status..."
REGION=$(aws configure get region)
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

if ! aws cloudformation describe-stacks --stack-name CDKToolkit --region "$REGION" >/dev/null 2>&1; then
    echo "🔧 Bootstrapping CDK..."
    cdk bootstrap "aws://$ACCOUNT_ID/$REGION"
else
    echo "✅ CDK already bootstrapped"
fi

# Install packages
echo "📦 Installing packages..."
npm run install-packages

# Deploy application
echo "🚀 Deploying application..."
npm run deploy-all

# Get CloudFront URL
echo "🌐 Getting application URL..."
sleep 5  # Wait for stack outputs to be available

CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
    --stack-name $(aws cloudformation list-stacks \
        --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
        --query 'StackSummaries[?starts_with(StackName, `AutoInvoiceAPPwebsitewafstack`)].StackName' \
        --output text) \
    --query 'Stacks[0].Outputs[?OutputKey==`configwebsitedistributiondomain`].OutputValue' \
    --output text 2>/dev/null)

echo ""
echo "🎉 Deployment completed successfully!"
if [ -n "$CLOUDFRONT_URL" ] && [ "$CLOUDFRONT_URL" != "None" ]; then
    echo "📱 Access your application at: https://$CLOUDFRONT_URL"
else
    echo "📱 Check AWS Console for your CloudFront distribution URL"
fi

echo ""
echo "📋 Remember to:"
echo "   • Enable Anthropic Claude Sonnet 3.5 v2 in Amazon Bedrock"
echo "   • Set up AWS Budget for cost monitoring"
