// Define allowed origins
export const ALLOWED_ORIGINS = [
    /^https?:\/\/localhost(:\d+)?$/,                // localhost with any port
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/,             // 127.0.0.1 with any port
    /^https?:\/\/[a-zA-Z0-9-]+\.mystwright\.com$/,  // Any subdomain of mystwright.com
];

/**
 * Generate appropriate CORS headers based on the origin of the request.
 * 
 * @param request - The incoming request
 * @returns An object containing CORS headers
 */
export function getCorsHeaders(request: Request): Record<string, string> {
    const origin = request.headers.get('Origin') || '';
    
    // Check if the origin is allowed
    const isAllowed = ALLOWED_ORIGINS.some(pattern => pattern.test(origin));

    let headers: Record<string, string> = {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
    };
    
    // TODO: Fix CORS issues properly instead of disabling it
    // Looks like origin isn't being passed to us by the GKE Gateway, so we can't validate it properly
    // Set appropriate CORS headers
    // if (isAllowed) {
        // TODO: Add back when CORS issues are resolved
        // headers['Access-Control-Allow-Origin'] = origin;
        headers['Access-Control-Allow-Origin'] = '*';  // TEMPORARY: Allow all origins for now, to avoid CORS issues during development and testing. Change this in production!
        headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, PUT, DELETE, PATCH, HEAD';
        headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
        // TODO: Add back when CORS issues are resolved
        // headers['Access-Control-Allow-Credentials'] = 'true';
        headers['Access-Control-Max-Age'] = '86400'; // 24 hours
    // }

    return headers;
}