import { useState } from 'react';
import {
    Container,
    Header,
    Button,
    SpaceBetween,
    Alert,
    Box,
    StatusIndicator,
    FileUpload,
    Table,
    Modal
} from '@cloudscape-design/components';
import { uploadData, downloadData } from 'aws-amplify/storage';
import { supplierMatcher, SupplierRecord } from '../services/supplierMatching';

export const SupplierListManager = () => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'success' | 'error' | null>(null);
    const [uploadMessage, setUploadMessage] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleFileUpload = async () => {
        if (selectedFiles.length === 0) {
            setUploadStatus('error');
            setUploadMessage('Please select a CSV file to upload.');
            return;
        }

        const file = selectedFiles[0];
        if (!file.name.toLowerCase().endsWith('.csv')) {
            setUploadStatus('error');
            setUploadMessage('Please select a CSV file.');
            return;
        }

        setIsUploading(true);
        setUploadStatus(null);

        try {
            // Read file content
            const fileContent = await file.text();
            
            // Upload to S3
            await uploadData({
                path: 'SupplierList.csv',
                data: fileContent,
                options: {
                    contentType: 'text/csv'
                }
            }).result;

            // Reinitialize the supplier matcher with new data
            await supplierMatcher.initialize();

            setUploadStatus('success');
            setUploadMessage('Supplier list uploaded successfully! The system will now use this list for vendor matching.');
            setSelectedFiles([]);
        } catch (error) {
            console.error('Error uploading supplier list:', error);
            setUploadStatus('error');
            setUploadMessage(`Failed to upload supplier list: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handlePreviewSuppliers = async () => {
        setIsLoading(true);
        try {
            await supplierMatcher.initialize();
            const supplierList = supplierMatcher.getSuppliers();
            setSuppliers(supplierList.slice(0, 50)); // Show first 50 for preview
            setShowPreview(true);
        } catch (error) {
            console.error('Error loading suppliers:', error);
            setUploadStatus('error');
            setUploadMessage('Failed to load supplier list. Please ensure the CSV file is uploaded.');
        } finally {
            setIsLoading(false);
        }
    };

    const downloadTemplate = () => {
        const templateContent = `Supplier,Name 1,Name 2,Group,Group,C/R,C/R,To Send to AWS vendor
100161,Amber World Group Limited,,V001,2OITSYSSVC,HK,,Matched vendor
100199,"ASA Business Service Co., Ltd",,V001,4FAEQ,HK,,Matched vendor
100479,Core-World Limited,,V001,2DPEMFIRES,HK,,SIMILAR`;

        const blob = new Blob([templateContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'SupplierList_Template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <>
            <Container header={<Header variant="h2">Supplier List Management</Header>}>
                <SpaceBetween size="l">
                    <Alert type="info" header="About Supplier Matching">
                        Upload your supplier list CSV file to enable automatic vendor matching. 
                        When documents are processed, the system will extract vendor names and match them 
                        against your supplier database using AI-powered similarity matching.
                    </Alert>

                    <SpaceBetween size="m">
                        <Box>
                            <Box variant="h3">Upload Supplier List</Box>
                            <Box variant="p" color="text-body-secondary">
                                Upload a CSV file containing your supplier information. The file should include 
                                columns for Supplier Code, Name 1, Name 2, and other relevant fields.
                            </Box>
                        </Box>

                        <FileUpload
                            onChange={({ detail }) => setSelectedFiles(detail.value)}
                            value={selectedFiles}
                            i18nStrings={{
                                uploadButtonText: e => e ? "Choose files" : "Choose file",
                                dropzoneText: e => e ? "Drop files to upload" : "Drop file to upload",
                                removeFileAriaLabel: e => `Remove file ${e + 1}`,
                                limitShowFewer: "Show fewer files",
                                limitShowMore: "Show more files",
                                errorIconAriaLabel: "Error"
                            }}
                            showFileLastModified
                            showFileSize
                            showFileThumbnail
                            tokenLimit={3}
                            accept=".csv"
                        />

                        <SpaceBetween size="s" direction="horizontal">
                            <Button 
                                variant="primary" 
                                onClick={handleFileUpload}
                                loading={isUploading}
                                disabled={selectedFiles.length === 0}
                            >
                                Upload Supplier List
                            </Button>
                            <Button 
                                variant="normal" 
                                onClick={downloadTemplate}
                            >
                                Download Template
                            </Button>
                            <Button 
                                variant="normal" 
                                onClick={handlePreviewSuppliers}
                                loading={isLoading}
                            >
                                Preview Current List
                            </Button>
                        </SpaceBetween>

                        {uploadStatus && (
                            <Alert 
                                type={uploadStatus} 
                                dismissible 
                                onDismiss={() => setUploadStatus(null)}
                            >
                                {uploadMessage}
                            </Alert>
                        )}
                    </SpaceBetween>
                </SpaceBetween>
            </Container>

            <Modal
                visible={showPreview}
                onDismiss={() => setShowPreview(false)}
                header="Supplier List Preview"
                size="large"
                footer={
                    <Box float="right">
                        <Button variant="primary" onClick={() => setShowPreview(false)}>
                            Close
                        </Button>
                    </Box>
                }
            >
                <Container>
                    <SpaceBetween size="m">
                        <Box>
                            <StatusIndicator type="success">
                                {suppliers.length} suppliers loaded (showing first 50)
                            </StatusIndicator>
                        </Box>
                        
                        <Table
                            columnDefinitions={[
                                {
                                    id: "supplier",
                                    header: "Supplier Code",
                                    cell: item => item.supplier,
                                    width: 120
                                },
                                {
                                    id: "name1",
                                    header: "Name 1",
                                    cell: item => item.name1,
                                    width: 200
                                },
                                {
                                    id: "name2",
                                    header: "Name 2",
                                    cell: item => item.name2 || '-',
                                    width: 150
                                },
                                {
                                    id: "combined",
                                    header: "Combined Name",
                                    cell: item => item.combinedName,
                                    width: 250
                                }
                            ]}
                            items={suppliers}
                            variant="embedded"
                            stripedRows
                            contentDensity="compact"
                            empty={
                                <Box textAlign="center" color="inherit">
                                    <b>No suppliers found</b>
                                    <Box variant="p" color="inherit">
                                        Upload a supplier list CSV file to see suppliers here.
                                    </Box>
                                </Box>
                            }
                        />
                    </SpaceBetween>
                </Container>
            </Modal>
        </>
    );
};
