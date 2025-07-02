import React from 'react';
import Frame from 'react-frame-component';
import { 
    Box,
    LiveRegion,
} from "@cloudscape-design/components";
import { LoadingBar } from "@cloudscape-design/chat-components";
import { LogoProvider } from './LogoProvider';

interface HtmlPreviewProps {
    html: string;
    isLoading?: boolean;
}

export const HtmlPreview: React.FC<HtmlPreviewProps> = ({ 
    html, 
    isLoading = false
}) => {
    console.log('HtmlPreview debug:', { 
        isLoading, 
        hasHtml: !!html, 
        htmlLength: html?.length,
        htmlContent: html
    });

    if (isLoading) {
        return (
            <Box padding="xxl">
                <LiveRegion>
                    <Box
                        margin={{ bottom: "xs", left: "l" }}
                        color="text-body-secondary"
                        textAlign="center"
                    >
                        Generating CSV file...
                    </Box>
                    <LoadingBar variant="gen-ai" />
                </LiveRegion>
            </Box>
        );
    }

    if (!html) {
        return (
            <Box textAlign="center" padding="xxl">
                <Box variant="h3">No content available</Box>
            </Box>
        );
    }

    return (
        <Box padding="l">
            <LogoProvider content={html} />
        </Box>
    );
};
