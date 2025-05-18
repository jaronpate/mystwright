// Define allowed origins
export const ALLOWED_ORIGINS = [
    /^https?:\/\/localhost(:\d+)?$/,                // localhost with any port
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/,             // 127.0.0.1 with any port
    /^https?:\/\/[a-zA-Z0-9-]+\.fishhat\.dev$/,     // Any subdomain of fishhat.dev
    /^https?:\/\/[a-zA-Z0-9-]+\.hat\.fish$/,        // Any subdomain of hat.fish
    /^https?:\/\/[a-zA-Z0-9-]+\.pusledmd\.com$/,    // Any subdomain of pusledmd.com
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
    
    // Set appropriate CORS headers
    if (isAllowed) {
        return {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '86400', // 24 hours
        };
    }
    
    // For non-allowed origins, return restrictive headers
    return {
        'Access-Control-Allow-Origin': '*', // Fallback to * for development
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
}