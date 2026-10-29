export function preserveDownloads(options?: {
    metadataPath?: string;
    downloadsDir?: string;
    fetchImpl?: typeof fetch;
    log?: (message: string) => void;
}): Promise<void>;
