export const PART_BYTES: number;
export const SITE: string;
export const BUILD_NAME: RegExp;
export function downloadPartCount(size: number): number;
export function stage(source: string, name: string, destination?: string): {
    url: string;
    name: string;
    size: number;
    sizeLabel: string;
    sha256: string;
    parts: number;
};
export function sizeLabel(bytes: number): string;
