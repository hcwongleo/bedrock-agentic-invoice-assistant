import { Box, Icon, Spinner } from "@cloudscape-design/components";
import { PdfPreview } from './PdfPreview';
import { useState, useEffect } from 'react';

interface ThumbnailProps {
    url: string;
    documentName: string;
}

const getFileType = (fileName: string): 'pdf' | 'image' | 'unknown' => {

    if (!fileName) {
        console.log('Filename is undefined or empty');
        return 'unknown';
    }

    const extension = fileName.toLowerCase().split('.').pop();

    if (extension === 'pdf') return 'pdf';
    if (['png', 'jpg', 'jpeg', 'gif'].includes(extension || '')) return 'image';
    return 'unknown';
};

export const Thumbnail = ({ url, documentName }: ThumbnailProps) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const fileType = getFileType(documentName);

    if (fileType === 'pdf') {
        return (
            <Box
                textAlign="center"
                padding="s"
            >
                <PdfPreview url={url} width={90} />
            </Box>
        );
    }

    if (fileType === 'image') {
        return (
            <Box
                textAlign="center"
                padding="s"
            >
                {isLoading && <Spinner />}
                {hasError ? (
                    <Box
                        color="text-status-error"
                        textAlign="center"
                    >
                        <Icon name="file" size="big" />
                        Image
                    </Box>
                ) : (
                    <img
                        src={url}
                        alt={documentName}
                        style={{
                            width: '90px',
                            height: '100px',
                            objectFit: 'cover',
                            display: isLoading ? 'none' : 'block'
                        }}
                        onLoad={() => setIsLoading(false)}
                        onError={(e) => {
                            console.error('Image failed to load:', url);
                            setIsLoading(false);
                            setHasError(true);
                        }}
                    />
                )}
            </Box>
        );
    }

    // For unknown file types
    return (
        <Box
            textAlign="center"
            padding="s"
        >
            <Icon name="file" size="big" />
        </Box>
    );
};
