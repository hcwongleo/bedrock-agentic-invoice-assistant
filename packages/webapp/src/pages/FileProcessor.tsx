import { useState, useEffect } from 'react';
import { 
    Box, 
    SpaceBetween, 
    Container,
    Header,
    Grid,
    ColumnLayout,
    StatusIndicator,
    Button,
    Modal,
    CodeEditor,
    Tabs,
    TabsProps
} from "@cloudscape-design/components";
import { FileUpload } from '../components/FileUpload';
import { SupplierListManager } from '../components/SupplierListManager';
import { useBDAResults, findBDAResultForFile, BDAResult } from '../hooks/useBDAResults';

interface ProcessedFile {
    fileName: string;
    uploadTime: Date;
    status: 'uploaded' | 'processing' | 'completed' | 'error';
    bdaResult?: BDAResult;
    errorMessage?: string;
}

export const FileProcessor = () => {
    const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
    const [selectedResult, setSelectedResult] = useState<BDAResult | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [activeTabId, setActiveTabId] = useState('overview');

    // Use the new BDA results hook
    const { data: bdaResults, isLoading: isBDALoading } = useBDAResults();

    // Helper function to render JSON data as a table
    const renderJsonTable = (data: any): JSX.Element => {
        if (!data || typeof data !== 'object') {
            return <Box>{String(data || 'N/A')}</Box>;
        }

        if (Array.isArray(data)) {
            return (
                <div>
                    {data.map((item, index) => (
                        <div key={index} style={{ marginBottom: '0.5rem' }}>
                            <Box fontWeight="bold">Item {index + 1}:</Box>
                            {renderJsonTable(item)}
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                fontSize: '14px'
            }}>
                <tbody>
                    {Object.entries(data).map(([key, value]) => (
                        <tr key={key} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ 
                                padding: '8px 12px',
                                fontWeight: 'bold',
                                backgroundColor: '#f9fafb',
                                verticalAlign: 'top',
                                width: '30%',
                                wordBreak: 'break-word'
                            }}>
                                {key}
                            </td>
                            <td style={{ 
                                padding: '8px 12px',
                                verticalAlign: 'top',
                                wordBreak: 'break-word'
                            }}>
                                {typeof value === 'object' ? renderJsonTable(value) : String(value || 'N/A')}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    // Handle file upload completion
    const handleUploadComplete = (fileName: string) => {
        const newFile: ProcessedFile = {
            fileName,
            uploadTime: new Date(),
            status: 'processing'
        };
        
        setProcessedFiles(prev => [...prev, newFile]);
    };

    // Handle upload errors
    const handleUploadError = (error: string) => {
        console.error('Upload error:', error);
    };

    // Update file status based on BDA results
    useEffect(() => {
        console.log('🚀 ~ FileProcessor ~ bdaResults:', bdaResults);
        if (bdaResults && bdaResults.length > 0) {
            setProcessedFiles(prev => 
                prev.map(file => {
                    console.log('🚀 ~ FileProcessor ~ processing file:', file);
                    if (file.status === 'processing') {
                        const bdaResult = findBDAResultForFile(file.fileName, bdaResults);
                        console.log('🚀 ~ FileProcessor ~ bdaResult for', file.fileName, ':', bdaResult);
                        
                        if (bdaResult) {
                            return {
                                ...file,
                                status: 'completed' as const,
                                bdaResult
                            };
                        }
                    }
                    
                    return file;
                })
            );
        }
    }, [bdaResults]);

    const getStatusIndicator = (status: ProcessedFile['status']) => {
        switch (status) {
            case 'uploaded':
                return <StatusIndicator type="pending">Uploaded</StatusIndicator>;
            case 'processing':
                return <StatusIndicator type="in-progress">Processing</StatusIndicator>;
            case 'completed':
                return <StatusIndicator type="success">Completed</StatusIndicator>;
            case 'error':
                return <StatusIndicator type="error">Error</StatusIndicator>;
            default:
                return <StatusIndicator type="pending">Unknown</StatusIndicator>;
        }
    };

    const viewResult = (result: BDAResult) => {
        setSelectedResult(result);
        setIsModalVisible(true);
    };

    const tabs: TabsProps.Tab[] = [
        {
            label: "Overview",
            id: "overview",
            content: (
                <SpaceBetween size="m">
                    <Box>
                        <strong>Document Processing Summary</strong>
                    </Box>
                    <ColumnLayout columns={3}>
                        <div>
                            <Box variant="awsui-key-label">Total Files</Box>
                            <Box fontSize="display-l">{String(processedFiles.length)}</Box>
                        </div>
                        <div>
                            <Box variant="awsui-key-label">Completed</Box>
                            <Box fontSize="display-l" color="text-status-success">
                                {String(processedFiles.filter(f => f.status === 'completed').length)}
                            </Box>
                        </div>
                        <div>
                            <Box variant="awsui-key-label">Processing</Box>
                            <Box fontSize="display-l" color="text-status-info">
                                {String(processedFiles.filter(f => f.status === 'processing').length)}
                            </Box>
                        </div>
                    </ColumnLayout>
                </SpaceBetween>
            )
        },
        {
            label: "File List",
            id: "files",
            content: (
                <SpaceBetween size="s">
                    {processedFiles.length === 0 ? (
                        <Box textAlign="center" color="text-body-secondary">
                            No files uploaded yet. Upload some documents to get started.
                        </Box>
                    ) : (
                        processedFiles.map((file, index) => (
                            <Container key={index}>
                                <SpaceBetween direction="horizontal" size="m">
                                    <div style={{ flex: 1 }}>
                                        <Box fontWeight="bold">{String(file.fileName || 'Unknown file')}</Box>
                                        <Box color="text-body-secondary" fontSize="body-s">
                                            Uploaded: {file.uploadTime ? file.uploadTime.toLocaleString() : 'Unknown time'}
                                        </Box>
                                    </div>
                                    <div>
                                        {getStatusIndicator(file.status)}
                                    </div>
                                    {file.status === 'completed' && file.bdaResult && (
                                        <Button
                                            variant="primary"
                                            onClick={() => viewResult(file.bdaResult!)}
                                        >
                                            View Results
                                        </Button>
                                    )}
                                </SpaceBetween>
                            </Container>
                        ))
                    )}
                </SpaceBetween>
            )
        },
        {
            label: "Supplier Management",
            id: "suppliers",
            content: <SupplierListManager />
        }
    ];

    return (
        <SpaceBetween size="l">
            {/* Header */}
            <Container
                header={
                    <Header 
                        variant="h1"
                        description="Upload invoice documents and view automated processing results"
                    >
                        Invoice Document Processor
                    </Header>
                }
            >
                <Box>
                    This application automatically processes uploaded invoice documents using Amazon Bedrock Data Automation.
                    Upload your PDF or image files below and monitor the processing status in real-time.
                </Box>
            </Container>

            {/* Main Content Grid */}
            <Grid gridDefinition={[{ colspan: 6 }, { colspan: 6 }]}>
                {/* File Upload Section */}
                <div>
                    <FileUpload
                        onUploadComplete={handleUploadComplete}
                        onUploadError={handleUploadError}
                    />
                </div>

                {/* Processing Status Section */}
                <div>
                    <Container
                        header={<Header>Processing Status</Header>}
                    >
                        <Tabs
                            activeTabId={activeTabId}
                            onChange={({ detail }) => setActiveTabId(detail.activeTabId)}
                            tabs={tabs}
                        />
                    </Container>
                </div>
            </Grid>

            {/* Results Modal */}
            <Modal
                onDismiss={() => setIsModalVisible(false)}
                visible={isModalVisible}
                header="BDA Processing Results"
                size="large"
            >
                {selectedResult && (
                    <SpaceBetween size="m">
                        <div>
                            <Box variant="awsui-key-label">Matched Blueprint</Box>
                            <Box>{selectedResult.matched_blueprint?.name || selectedResult.matched_blueprint?.arn || 'N/A'}</Box>
                            {selectedResult.matched_blueprint?.confidence && (
                                <Box color="text-body-secondary" fontSize="body-s">
                                    Confidence: {(selectedResult.matched_blueprint.confidence * 100).toFixed(1)}%
                                </Box>
                            )}
                        </div>
                        <div>
                            <Box variant="awsui-key-label">Document Class</Box>
                            <Box>{selectedResult.document_class?.type || 'N/A'}</Box>
                        </div>
                        <div>
                            <Box variant="awsui-key-label">Inference Result</Box>
                            <div style={{ 
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                overflow: 'hidden',
                                maxHeight: '500px',
                                overflowY: 'auto'
                            }}>
                                {renderJsonTable(selectedResult.inference_result)}
                            </div>
                        </div>
                    </SpaceBetween>
                )}
            </Modal>
        </SpaceBetween>
    );
};
