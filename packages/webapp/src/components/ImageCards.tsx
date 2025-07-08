import { Header, Cards, Spinner, Box, Icon, Button, SpaceBetween } from "@cloudscape-design/components";
import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from 'react-pdf';
import { PdfPreview } from '../components/PdfPreview';
import { fetchJsonFromPath, useS3ListItems } from "../hooks/useStorage";
import { QUERY_KEYS, DocumentType } from "../utils/types";
import { useAtom } from "jotai";
import { documentsAtom, selectionAtom } from "../atoms/WizardAtoms";
import { FileUpload } from './FileUpload';


const getFileType = (fileName: string): 'pdf' | 'image' | 'unknown' => {
    const extension = fileName.toLowerCase().split('.').pop();
    if (extension === 'pdf') return 'pdf';
    if (['png', 'jpg', 'jpeg', 'gif'].includes(extension || '')) return 'image';
    return 'unknown';
};

export const ImageCards = () => {
    const { data: documentItems, isLoading, refetch } = useS3ListItems(QUERY_KEYS.DOCUMENTS);
    const [documents, setDocuments] = useAtom(documentsAtom);
    const [selection, setSelection] = useAtom(selectionAtom);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [showUpload, setShowUpload] = useState(false);

    const clearSelection = () => {
        setSelection({
            selectedDocs: []
        });
    };

    useEffect(() => {
        console.log('Document Items:', documentItems);
    }, [documentItems]);

    useEffect(() => {
        setSelection({
            selectedDocs: []
        });
    }, []);

    useEffect(() => {
        return () => {
            clearSelection();
        };
    }, []);

    useEffect(() => {
        if (!documentItems) {
            setDocuments([]);
            return;
        }

        const docs = documentItems.map(item => ({
            id: item.itemName,
            title: item.itemName.replace(/\.(png|pdf)$/i, '').split('_').join(' '),
            description: `Document type: ${getFileType(item.itemName).toUpperCase()}`,
            imageUrl: item.url,
            fileType: getFileType(item.itemName)
        }));

        setDocuments(docs as [DocumentType]);
    }, [documentItems]);

    const onChangeDocumentSelection = (selectedItems: DocumentType[]) => {
        setSelection({
            selectedDocs: selectedItems
        });
    };

    const handleUploadComplete = (fileName: string) => {
        console.log('File uploaded successfully:', fileName);
        // Refresh the document list
        refetch();
        setShowUpload(false);
    };

    const handleUploadError = (error: string) => {
        console.error('Upload error:', error);
    };

    const renderDocumentPreview = (item: DocumentType) => {
        const fileType = getFileType(item.id);

        if (fileType === 'pdf') {
            return (
                <Box
                    padding="s"
                >
                    <PdfPreview url={item.imageUrl} width={180} />
                </Box>
            );
        }

        return (
            <img
                src={item.imageUrl}
                alt={item.title}
                style={{
                    width: '100%',
                    height: '200px',
                    objectFit: 'cover'
                }}
                onError={(e) => {
                    console.error('Image failed to load:', item.imageUrl);
                    e.currentTarget.style.display = 'none';
                }}
            />
        );
    };

    if (showUpload) {
        return (
            <Box padding="s">
                <SpaceBetween size="m">
                    <Button 
                        variant="link" 
                        iconName="arrow-left"
                        onClick={() => setShowUpload(false)}
                    >
                        Back to Document Selection
                    </Button>
                    <FileUpload 
                        onUploadComplete={handleUploadComplete}
                        onUploadError={handleUploadError}
                    />
                </SpaceBetween>
            </Box>
        );
    }

    return (
        <Box padding="s">
            {isLoading && <Spinner />}
            
            {!isLoading && documents.length === 0 && (
                <Box textAlign="center" padding="xl">
                    <SpaceBetween size="m">
                        <Icon name="file" size="big" />
                        <Box variant="h3">No documents available</Box>
                        <Box variant="p" color="text-body-secondary">
                            Upload your invoice documents to get started with processing.
                        </Box>
                        <Button 
                            variant="primary" 
                            iconName="upload"
                            onClick={() => setShowUpload(true)}
                        >
                            Upload Documents
                        </Button>
                    </SpaceBetween>
                </Box>
            )}

            {documents.length > 0 && (
                <SpaceBetween size="m">
                    <Box textAlign="right">
                        <Button 
                            variant="normal" 
                            iconName="add-plus"
                            onClick={() => setShowUpload(true)}
                        >
                            Upload More Documents
                        </Button>
                    </Box>
                    
                    <Cards
                        onSelectionChange={({ detail }) => 
                            onChangeDocumentSelection(detail.selectedItems)
                        }
                        selectedItems={selection.selectedDocs}
                        ariaLabels={{
                            itemSelectionLabel: (e, n) => `select ${n.title}`,
                            selectionGroupLabel: "Document selection"
                        }}
                        cardDefinition={{
                            header: item => (
                                <Box padding="s" fontSize="heading-m">
                                    {item.title}
                                </Box>
                            ),
                            sections: [
                                {
                                    id: "image",
                                    content: renderDocumentPreview
                                },
                                {
                                    id: "description",
                                    content: item => item.description
                                }
                            ]
                        }}
                        cardsPerRow={[
                            { cards: 1 },
                            { minWidth: 500, cards: 3 },
                            { minWidth: 900, cards: 3 }
                        ]}
                        items={documents}
                        loadingText="Loading documents"
                        selectionType="multi"
                        trackBy="id"
                        visibleSections={["image", "description"]}
                        header={
                            <Header
                                variant="h2"
                                counter={
                                    selection.selectedDocs.length
                                        ? `(${selection.selectedDocs.length}/${documents.length})`
                                        : `(${documents.length})`
                                }
                            >
                                Select Documents
                            </Header>
                        }
                    />
                </SpaceBetween>
            )}
        </Box>
    );
};

export default ImageCards;