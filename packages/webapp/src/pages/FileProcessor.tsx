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
        if (bdaResults && bdaResults.length > 0) {
            setProcessedFiles(prev => 
                prev.map(file => {
                    if (file.status === 'processing') {
                        const bdaResult = findBDAResultForFile(file.fileName, bdaResults);
                        
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
                            <Box fontSize="display-l">{processedFiles.length}</Box>
                        </div>
                        <div>
                            <Box variant="awsui-key-label">Completed</Box>
                            <Box fontSize="display-l" color="text-status-success">
                                {processedFiles.filter(f => f.status === 'completed').length}
                            </Box>
                        </div>
                        <div>
                            <Box variant="awsui-key-label">Processing</Box>
                            <Box fontSize="display-l" color="text-status-info">
                                {processedFiles.filter(f => f.status === 'processing').length}
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
                                        <Box fontWeight="bold">{file.fileName}</Box>
                                        <Box color="text-body-secondary" fontSize="body-s">
                                            Uploaded: {file.uploadTime.toLocaleString()}
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
                            <Box>{selectedResult.matched_blueprint || 'N/A'}</Box>
                        </div>
                        <div>
                            <Box variant="awsui-key-label">Document Class</Box>
                            <Box>{selectedResult.document_class || 'N/A'}</Box>
                        </div>
                        <div>
                            <Box variant="awsui-key-label">Inference Result</Box>
                            <CodeEditor
                                ace={undefined}
                                language="json"
                                value={JSON.stringify(selectedResult.inference_result, null, 2)}
                                loading={false}
                                onPreferencesChange={() => {}}
                                i18nStrings={{
                                    loadingState: "Loading code editor",
                                    errorState: "There was an error loading the code editor.",
                                    errorStateRecovery: "Retry",
                                    editorGroupAriaLabel: "Code editor",
                                    statusBarGroupAriaLabel: "Status bar",
                                    cursorPosition: (row, column) => `Ln ${row}, Col ${column}`,
                                    errorsTab: "Errors",
                                    warningsTab: "Warnings",
                                    preferencesButtonAriaLabel: "Preferences",
                                    paneCloseButtonAriaLabel: "Close",
                                    preferencesModalHeader: "Preferences",
                                    preferencesModalCancel: "Cancel",
                                    preferencesModalConfirm: "Confirm",
                                    preferencesModalWrapLines: "Wrap lines",
                                    preferencesModalTheme: "Theme",
                                    preferencesModalLightThemes: "Light themes",
                                    preferencesModalDarkThemes: "Dark themes"
                                }}
                            />
                        </div>
                    </SpaceBetween>
                )}
            </Modal>
        </SpaceBetween>
    );
};
