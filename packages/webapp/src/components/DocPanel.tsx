import React, { useState, useEffect } from 'react';
import { 
    SplitPanel, 
    Box, 
    SpaceBetween,
    Button,
    Header,
    Container,
} from '@cloudscape-design/components';
import { PdfPreview } from '../components/PdfPreview';

interface DocPanelProps {
    documentUrl: string;
    documentName: string;
    documentType?: string;
    aiAnalysis?: any;
}

export const DocPanel: React.FC<DocPanelProps> = ({ 
    documentUrl, 
    documentName,
    documentType,
    aiAnalysis 
}) => {
    const [zoomLevel, setZoomLevel] = useState(100);
    
    const getFileType = (fileName: string): 'pdf' | 'image' | 'unknown' => {
        const extension = fileName.toLowerCase().split('.').pop();
        if (extension === 'pdf') return 'pdf';
        if (['png', 'jpg', 'jpeg', 'gif'].includes(extension || '')) return 'image';
        return 'unknown';
    };

    const fileType = getFileType(documentName);

    const renderContent = () => {
        switch(fileType) {
            case 'pdf':
                return (
                    <Box>
                        <PdfPreview 
                            url={documentUrl} 
                            width={600}
                        />
                    </Box>
                );
            case 'image':
                return (
                    <img 
                        src={documentUrl}
                        alt={documentName}
                        style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            transform: `scale(${zoomLevel / 100})`,
                            transformOrigin: 'center center'
                        }}
                    />
                );
            default:
                return (
                    <Box textAlign="center">
                        Unsupported file type
                    </Box>
                );
        }
    };

    return (
    <>
        <Box>
            <Header
                variant="h2"
                actions={
                    <SpaceBetween direction="horizontal" size="xs">
                        {fileType === 'image' && (
                            <>
                                <Button
                                    iconName="zoom-out"
                                    variant="icon"
                                    onClick={() => setZoomLevel(Math.max(zoomLevel - 25, 25))}
                                />
                                <Button variant="inline-icon">
                                    {zoomLevel}%
                                </Button>
                                <Button
                                    iconName="zoom-in"
                                    variant="icon"
                                    onClick={() => setZoomLevel(Math.min(zoomLevel + 25, 200))}
                                />
                            </>
                        )}
                    </SpaceBetween>
                }
            >
            </Header>
        </Box>
        <SplitPanel header={documentName}>
            <Box padding="s">
                <div style={{ 
                    width: '100%',
                    height: 'calc(100vh - 200px)',
                    overflow: 'auto',
                    backgroundColor: 'white',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    padding: '20px'
                }}>
                    {renderContent()}
                </div>
            </Box>
        </SplitPanel>
    </>
    );
};
