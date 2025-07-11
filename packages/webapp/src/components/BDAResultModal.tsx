import { 
    Modal, 
    Box, 
    SpaceBetween, 
    Container, 
    Header, 
    Button,
    Table,
    StatusIndicator,
    Tabs,
    Alert
} from "@cloudscape-design/components";
import { useState } from 'react';

interface BDAResultModalProps {
    visible: boolean;
    onDismiss: () => void;
    bdaResult: any;
    fileName: string;
}

export const BDAResultModal = ({ visible, onDismiss, bdaResult, fileName }: BDAResultModalProps) => {
    const [activeTabId, setActiveTabId] = useState("csv-view");

    if (!bdaResult) return null;

    // Convert BDA result to CSV-like format
    const convertToCSVFormat = (data: any) => {
        const csvRows: string[][] = [];
        
        // Add header row
        csvRows.push(['Field', 'Value', 'Confidence', 'Source']);
        
        // Extract key fields from BDA result
        const extractFields = (obj: any, prefix = ''): string[][] => {
            const fields: string[][] = [];
            
            if (obj && typeof obj === 'object') {
                Object.keys(obj).forEach(key => {
                    const value = obj[key];
                    const fieldName = prefix ? `${prefix}.${key}` : key;
                    
                    if (value && typeof value === 'object' && !Array.isArray(value)) {
                        // Recursively extract nested objects
                        fields.push(...extractFields(value, fieldName));
                    } else if (Array.isArray(value)) {
                        // Handle arrays
                        if (value.length === 0) {
                            fields.push([fieldName, '[]', '', 'BDA']);
                        } else {
                            value.forEach((item, index) => {
                                if (typeof item === 'object') {
                                    fields.push(...extractFields(item, `${fieldName}[${index}]`));
                                } else {
                                    fields.push([fieldName + `[${index}]`, String(item), '', 'BDA']);
                                }
                            });
                        }
                    } else {
                        // Simple field - ensure it's converted to string
                        let stringValue = '';
                        if (value !== null && value !== undefined) {
                            if (typeof value === 'boolean') {
                                stringValue = value ? 'true' : 'false';
                            } else if (typeof value === 'number') {
                                stringValue = value.toString();
                            } else {
                                stringValue = String(value);
                            }
                        }
                        fields.push([fieldName, stringValue, '', 'BDA']);
                    }
                });
            }
            
            return fields;
        };

        // Extract from inference_result if available
        if (data.inference_result) {
            csvRows.push(...extractFields(data.inference_result, 'invoice'));
        }

        // Add document metadata
        if (data.document_class) {
            csvRows.push([
                'document_class', 
                String(data.document_class.type || ''), 
                String(data.document_class.confidence || ''), 
                'BDA'
            ]);
        }

        if (data.matched_blueprint) {
            csvRows.push([
                'matched_blueprint', 
                String(data.matched_blueprint.name || ''), 
                String(data.matched_blueprint.confidence || ''), 
                'BDA'
            ]);
        }

        return csvRows;
    };

    const csvData = convertToCSVFormat(bdaResult);

    // Generate downloadable CSV content
    const generateCSVContent = () => {
        return csvData.map(row => 
            row.map((cell: string) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');
    };

    const downloadCSV = () => {
        const csvContent = generateCSVContent();
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${fileName.replace(/\.[^/.]+$/, '')}-bda-result.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const copyToClipboard = () => {
        const csvContent = generateCSVContent();
        navigator.clipboard.writeText(csvContent).then(() => {
            // You could add a toast notification here
            console.log('CSV content copied to clipboard');
        });
    };

    return (
        <Modal
            visible={visible}
            onDismiss={onDismiss}
            header="BDA Processing Results"
            size="max"
            footer={
                <Box float="right">
                    <SpaceBetween direction="horizontal" size="xs">
                        <Button 
                            variant="normal" 
                            iconName="copy"
                            onClick={copyToClipboard}
                        >
                            Copy CSV
                        </Button>
                        <Button 
                            variant="normal" 
                            iconName="download"
                            onClick={downloadCSV}
                        >
                            Download CSV
                        </Button>
                        <Button variant="primary" onClick={onDismiss}>
                            Close
                        </Button>
                    </SpaceBetween>
                </Box>
            }
        >
            <SpaceBetween size="l">
                <Alert type="info">
                    <Box>
                        <strong>Document:</strong> {String(fileName)}<br/>
                        <strong>Processing Status:</strong> <StatusIndicator type="success">Completed</StatusIndicator><br/>
                        <strong>Document Type:</strong> {String(bdaResult.document_class?.type || 'Unknown')}<br/>
                        <strong>Confidence:</strong> {bdaResult.matched_blueprint?.confidence ? `${(bdaResult.matched_blueprint.confidence * 100).toFixed(1)}%` : 'N/A'}
                    </Box>
                </Alert>

                <Tabs
                    activeTabId={activeTabId}
                    onChange={({ detail }) => setActiveTabId(detail.activeTabId)}
                    tabs={[
                        {
                            id: "csv-view",
                            label: "CSV Format View",
                            content: (
                                <Container header={<Header variant="h3">Extracted Data in CSV Format</Header>}>
                                    <Table
                                        columnDefinitions={[
                                            {
                                                id: "field",
                                                header: "Field",
                                                cell: item => String(item[0] || ''),
                                                width: 200
                                            },
                                            {
                                                id: "value",
                                                header: "Value",
                                                cell: item => {
                                                    const value = item[1];
                                                    let displayValue = '-';
                                                    
                                                    try {
                                                        if (value !== null && value !== undefined) {
                                                            if (typeof value === 'object') {
                                                                displayValue = JSON.stringify(value);
                                                            } else {
                                                                displayValue = String(value);
                                                            }
                                                        }
                                                    } catch (error) {
                                                        displayValue = 'Error displaying value';
                                                        console.error('Error converting value to string:', error);
                                                    }
                                                    
                                                    return displayValue;
                                                },
                                                width: 300
                                            },
                                            {
                                                id: "confidence",
                                                header: "Confidence",
                                                cell: item => {
                                                    const confidence = item[2];
                                                    if (confidence && typeof confidence === 'number') {
                                                        return `${(confidence * 100).toFixed(1)}%`;
                                                    }
                                                    return String(confidence || '-');
                                                },
                                                width: 100
                                            },
                                            {
                                                id: "source",
                                                header: "Source",
                                                cell: item => String(item[3] || 'BDA'),
                                                width: 100
                                            }
                                        ]}
                                        items={csvData.slice(1)} // Skip header row
                                        variant="embedded"
                                        wrapLines
                                        stripedRows
                                        contentDensity="compact"
                                        empty={
                                            <Box textAlign="center" color="inherit">
                                                <b>No data extracted</b>
                                                <Box variant="p" color="inherit">
                                                    The BDA processing did not extract any structured data.
                                                </Box>
                                            </Box>
                                        }
                                    />
                                </Container>
                            )
                        },
                        {
                            id: "raw-json",
                            label: "Raw JSON",
                            content: (
                                <Container header={<Header variant="h3">Raw BDA Response</Header>}>
                                    <Box>
                                        <pre style={{
                                            backgroundColor: '#f8f9fa',
                                            padding: '16px',
                                            borderRadius: '4px',
                                            overflow: 'auto',
                                            fontSize: '14px',
                                            lineHeight: '1.4',
                                            maxHeight: '400px'
                                        }}>
                                            {JSON.stringify(bdaResult, null, 2)}
                                        </pre>
                                    </Box>
                                </Container>
                            )
                        }
                    ]}
                />

                <Container header={<Header variant="h3">Next Steps</Header>}>
                    <SpaceBetween size="s">
                        <Box variant="p">
                            <strong>1. Review the extracted data</strong> - Check the CSV format view above to ensure all important fields were captured correctly.
                        </Box>
                        <Box variant="p">
                            <strong>2. Download or copy the CSV</strong> - Use the buttons above to get the data in CSV format for further processing.
                        </Box>
                        <Box variant="p">
                            <strong>3. Import to your system</strong> - The CSV can be imported into accounting software, ERP systems, or spreadsheet applications.
                        </Box>
                        <Box variant="p">
                            <strong>4. Validate vendor information</strong> - Cross-reference vendor details with your master vendor list for accuracy.
                        </Box>
                    </SpaceBetween>
                </Container>
            </SpaceBetween>
        </Modal>
    );
};
