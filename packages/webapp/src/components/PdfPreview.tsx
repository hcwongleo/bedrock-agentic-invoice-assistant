import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Box, Spinner } from "@cloudscape-design/components";

// Set worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfPreviewProps {
    url: string;
    width?: number;
}

export const PdfPreview = ({ url, width = 180 }: PdfPreviewProps) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    function onDocumentLoadSuccess() {
        setIsLoading(false);
    }

    function onDocumentLoadError(err: Error) {
        setError(err);
        setIsLoading(false);
    }

    return (
        <Box
            className="pdf-preview-container"
            padding="s"
        >
            {isLoading && (
                <Box>
                    <Spinner size="big" />
                </Box>
            )}
            <Document
                file={url}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                    <Box>
                        <Spinner size="big" />
                    </Box>
                }
            >
                <Page 
                    pageNumber={1} 
                    width={width}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                />
            </Document>
            {error && !isLoading && (
                <Box textAlign="center" color="text-status-error">
                    Failed to load PDF
                </Box>
            )}
        </Box>
    );
};
