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
            title: "✅ Real-time Validation",
            description: "Provides real-time document validation and verification to ensure data accuracy and completeness before processing."
        },
        {
            title: "🏢 Vendor Identification",
            description: "Advanced vendor identification system that automatically recognizes and categorizes suppliers from invoice documents."
        },
        {
            title: "📋 SAP Integration",
            description: "Generates SAP data input forms automatically, streamlining the integration process with existing enterprise systems."
        },
        {
            title: "💬 Interactive Assistant",
            description: "Built-in chatbot provides interactive assistance for invoice processing, helping users navigate through the system efficiently."
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
            header={<h2>Invoice Processing Assistant</h2>}
        >
            <TextContent>
                <SpaceBetween size="l">
                    <Box>
                        <h3>🎯 Solution Overview</h3>
                        <Box variant="p" color="text-body-secondary">
                            This automated invoice processing system streamlines invoice processing and vendor identification, 
                            helping reduce manual processing time, minimize errors, and provide better user experience through 
                            AI-powered document processing and validation.
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
                                <strong>1. Upload Documents:</strong> Click the upload button (📤) in the chat interface to upload your invoice PDFs or images
                            </Box>
                            <Box variant="p">
                                <strong>2. Select Documents:</strong> Choose the uploaded documents you want to process from the document gallery
                            </Box>
                            <Box variant="p">
                                <strong>3. AI Processing:</strong> Let Amazon Bedrock extract and validate data automatically from your selected documents
                            </Box>
                            <Box variant="p">
                                <strong>4. Review Results:</strong> Verify extracted information and vendor details in the review dashboard
                            </Box>
                            <Box variant="p">
                                <strong>5. Generate Output:</strong> Create SAP-ready data input forms from the processed invoice data
                            </Box>
                            <Box variant="p">
                                <strong>6. Chat Assistant:</strong> Use the interactive chatbot for guidance and support throughout the process
                            </Box>
                        </SpaceBetween>
                    </Container>
                </SpaceBetween>
            </TextContent>
        </HelpPanel>
    );
};