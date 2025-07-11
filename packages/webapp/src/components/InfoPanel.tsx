import { 
    HelpPanel, 
    TextContent, 
    Box, 
    SpaceBetween,
    Container,
    Header
} from "@cloudscape-design/components";

export const InfoPanel = () => {
    const features = [
        {
            title: "🔍 Intelligent Document Processing",
            description: "Automated invoice processing system that streamlines document upload, data extraction, and validation using AI-powered document processing."
        },
        {
            title: "📄 Multi-Format Support",
            description: "Supports intelligent document upload and processing for both PDF files and image formats, ensuring flexibility in document handling."
        },
        {
            title: "🤖 Automated Data Extraction",
            description: "Leverages Amazon Bedrock Data Automation to automatically extract key information from invoices and other financial documents."
        },
        {
            title: "✅ Real-time Processing Status",
            description: "Provides real-time processing status updates and monitoring as documents are processed through the BDA pipeline."
        },
        {
            title: "🏢 Vendor Identification",
            description: "Advanced vendor identification system that automatically recognizes and categorizes suppliers from invoice documents."
        },
        {
            title: "📋 Results Visualization",
            description: "Interactive interface to view and analyze extracted data with detailed JSON results and processing insights."
        },
        {
            title: "🔒 Secure Storage",
            description: "Implements secure document storage system ensuring data privacy and compliance with enterprise security standards."
        }
    ];

    const architecture = [
        {
            component: "Amazon Bedrock Data Automation",
            purpose: "Automated data extraction from invoice documents"
        },
        {
            component: "Amazon Bedrock Multi-Agent System",
            purpose: "Document verification and vendor identification"
        },
        {
            component: "AWS Lambda",
            purpose: "Serverless compute for processing workflows"
        },
        {
            component: "Amazon S3",
            purpose: "Secure document storage and management"
        },
        {
            component: "Amazon CloudFront",
            purpose: "Content delivery and web application hosting"
        },
        {
            component: "Amazon Cognito",
            purpose: "User authentication and access control"
        }
    ];

    return (
        <HelpPanel
            footer={
                <TextContent>
                    <h3>Learn more</h3>
                    <ul>
                        <li>
                            <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/bda.html">
                                Amazon Bedrock Data Automation
                            </a>
                        </li>
                        <li>
                            <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agents-multi-agent-collaboration.html">
                                Amazon Bedrock Multi-Agent Collaboration
                            </a>
                        </li>
                        <li>
                            <a href="https://aws.amazon.com/bedrock/">
                                Amazon Bedrock Overview
                            </a>
                        </li>
                    </ul>
                </TextContent>
            }
            header={<h2>Document Processing Assistant</h2>}
        >
            <TextContent>
                <SpaceBetween size="l">
                    <Box>
                        <h3>🎯 Solution Overview</h3>
                        <Box variant="p" color="text-body-secondary">
                            This automated document processing system provides a streamlined interface for uploading invoice documents 
                            and viewing AI-powered extraction results. Upload your PDFs or images, monitor real-time processing status, 
                            and access detailed extraction results through Amazon Bedrock Data Automation.
                        </Box>
                    </Box>

                    <Container header={<Header variant="h3">✨ Key Features</Header>}>
                        <SpaceBetween size="m">
                            {features.map((feature, index) => (
                                <Box key={index}>
                                    <Box variant="strong">{feature.title}</Box>
                                    <Box variant="p" color="text-body-secondary" padding={{ top: 'xs' }}>
                                        {feature.description}
                                    </Box>
                                </Box>
                            ))}
                        </SpaceBetween>
                    </Container>

                    <Container header={<Header variant="h3">🏗️ Architecture Components</Header>}>
                        <SpaceBetween size="m">
                            {architecture.map((item, index) => (
                                <Box key={index}>
                                    <Box variant="strong">• {item.component}</Box>
                                    <Box variant="p" color="text-body-secondary" padding={{ left: 'l', top: 'xs' }}>
                                        {item.purpose}
                                    </Box>
                                </Box>
                            ))}
                        </SpaceBetween>
                    </Container>

                    <Container header={<Header variant="h3">💰 Cost Estimation</Header>}>
                        <Box variant="p" color="text-body-secondary">
                            <strong>Approximate monthly cost:</strong> $226 for processing 1,000 pages with 28,800 requests (us-east-1 region)
                        </Box>
                        <Box variant="p" color="text-body-secondary" padding={{ top: 's' }}>
                            Major cost components include Amazon Bedrock Data Automation ($40), 
                            Bedrock Agent with Claude Sonnet 3.5 v2 ($173), and supporting AWS services.
                        </Box>
                    </Container>

                    <Container header={<Header variant="h3">🚀 Getting Started</Header>}>
                        <SpaceBetween size="s">
                            <Box variant="p">
                                <strong>1. Upload Documents:</strong> Drag and drop your invoice PDFs or images into the upload area, or click to browse files
                            </Box>
                            <Box variant="p">
                                <strong>2. Monitor Processing:</strong> Watch the real-time processing status as Amazon Bedrock Data Automation extracts data
                            </Box>
                            <Box variant="p">
                                <strong>3. View Results:</strong> Click "View Results" when processing completes to see detailed extracted invoice data in JSON format
                            </Box>
                            <Box variant="p">
                                <strong>4. Process Multiple Files:</strong> Upload and process multiple documents simultaneously for batch processing
                            </Box>
                        </SpaceBetween>
                    </Container>
                </SpaceBetween>
            </TextContent>
        </HelpPanel>
    );
};