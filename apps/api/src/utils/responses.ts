import { getCorsHeaders } from './cors';

/**
 * Creates a JSON response with appropriate CORS headers
 */
export function jsonResponse(
    data: any, 
    req: Request, 
    status: number = 200
): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...getCorsHeaders(req)
        }
    });
}

export type APIError = {
    details?: string;
    code: string;
};

/**
 * Creates an error response
 */
export function errorResponse(
    error: string | APIError,
    req: Request,
    status: number = 400
): Response {
    if (typeof error === 'string') {
        return jsonResponse({ error }, req, status);
    }
    
    return jsonResponse({ error: error.code, details: error.details }, req, status);
}

/**
 * Map of file extensions to MIME types
 */
export const MIME_TYPES: Record<string, string> = {
    csv: 'text/csv',
    json: 'application/json',
    txt: 'text/plain',
    html: 'text/html',
    xml: 'application/xml',
    pdf: 'application/pdf',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    zip: 'application/zip',
    // Add more MIME types as needed
};

/**
 * Creates a file response with proper headers for download
 * 
 * @param data - The file content as a string or buffer
 * @param req - The original request
 * @param options - Configuration options for the file response
 * @returns Response object
 */
export function fileResponse(
    data: string | ArrayBuffer,
    req: Request,
    options: {
        filename: string;
        mimeType?: string;
        disposition?: 'attachment' | 'inline';
    }
): Response {
    const { filename, disposition = 'attachment' } = options;
    
    // Extract file extension from filename
    const fileExtension = filename.split('.').pop()?.toLowerCase() || '';
    
    // Determine content type: use provided mimeType, or lookup from extension, or default to octet-stream
    const contentType = options.mimeType || 
        (fileExtension && MIME_TYPES[fileExtension]) || 
        'application/octet-stream';
    
    return new Response(data, {
        headers: {
            'Content-Type': contentType,
            'Content-Disposition': `${disposition}; filename="${filename}"`,
            ...getCorsHeaders(req)
        }
    });
}

/**
 * Creates a CSV file response with proper headers for download
 * @deprecated Use fileResponse instead
 */
export function csvResponse(
    csvData: string,
    req: Request,
    filename: string = "download.csv"
): Response {
    return fileResponse(csvData, req, {
        filename,
        mimeType: 'text/csv'
    });
}

/**
 * Creates a response for preflight OPTIONS requests
 */
export function optionsResponse(req: Request): Response {
    return new Response(null, {
        status: 204,
        headers: getCorsHeaders(req)
    });
}