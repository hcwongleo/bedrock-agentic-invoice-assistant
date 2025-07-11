#!/bin/bash

# Bedrock Agentic Invoice Assistant - Frontend Only Deployment Script
# This script only deploys the frontend/webapp components

set -e  # Exit on any error

echo "🌐 Deploying Frontend Only - Bedrock Agentic Invoice Assistant"
echo "=============================================================="

# AWS credentials should be configured via AWS CLI or environment variables
# Run 'aws configure' to set up your credentials before running this script

# Install webapp dependencies
echo "📦 Installing webapp dependencies..."
cd packages/webapp
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "✅ Dependencies already installed"
fi
cd ../..

# Deploy frontend only
echo "🚀 Deploying frontend..."
npm run deploy-frontend

# Get CloudFront URL
echo "🌐 Getting application URL..."
sleep 3  # Wait for deployment to complete

CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
    --stack-name $(aws cloudformation list-stacks \
        --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
        --query 'StackSummaries[?starts_with(StackName, `AutoInvoiceAPPwebsitewafstack`)].StackName' \
        --output text) \
    --query 'Stacks[0].Outputs[?OutputKey==`configwebsitedistributiondomain`].OutputValue' \
    --output text 2>/dev/null)

echo ""
echo "🎉 Frontend deployment completed successfully!"
if [ -n "$CLOUDFRONT_URL" ] && [ "$CLOUDFRONT_URL" != "None" ]; then
    echo "📱 Access your application at: $CLOUDFRONT_URL"
else
    echo "📱 Check AWS Console for your CloudFront distribution URL"
fi

echo ""
echo "📋 Frontend deployment includes:"
echo "   • React webapp build and optimization"
echo "   • S3 bucket upload"
echo "   • CloudFront cache invalidation"
echo "   • Environment configuration"
echo ""
echo "💡 If you encounter issues:"
echo "   • Ensure AWS credentials are valid and not expired"
echo "   • Check that backend infrastructure is deployed"
echo "   • Verify you have permissions to update S3 and CloudFront"
