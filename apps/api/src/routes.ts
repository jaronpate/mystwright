import { authController } from './controllers/authController';
import { worldsController } from './controllers/worldsController';
import { jsonResponse, optionsResponse } from './utils/responses';
import { getCorsHeaders } from './utils/cors';
import { authMiddleware, type APIRequest, type AuthenticatedRequest } from './middleware/auth';

type Handler = (req: Request) => Promise<APIRequest | Response> | APIRequest | Response;

/**
 * Constructs a route object with default OPTIONS method for CORS preflight requests
 * @param methods - Object with HTTP methods as keys and handler functions as values
 * @returns A route object for use in `Bun.serve()`
 */
const constructRoutes = (methods?: Partial<Record<'GET' | 'POST' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD', (req: Request) => Promise<Response>>>) => {
    return {
        OPTIONS: optionsResponse,
        ...methods,
    }
}

/**
 * Constructs a route handler that processes a request through multiple handlers
 * @param handlers - Array of request handlers
 * @returns A function that processes the request through the handlers
 * If a handler returns a response, it is returned immediately.
 * If no handler returns a response, a 404 Not Found response is returned.
 */
const constructHandler = (...handlers: Array<Handler>) => {
    return async (req: Request) => {
        let request = req;
        for (const handler of handlers) {
            const response = await handler(request);
            if (response instanceof Response) {
                return response;
            } else {
                request = response;
            }
        }
        return jsonResponse({ message: "Not found" }, req, 404);
    };
};

/**
 * Defines all the routes and handlers for the API
 */
export const routes = {
    // Health check endpoint
    "/api/status": (req: Request) => {
        return new Response("OK", {
            headers: getCorsHeaders(req),
            status: 200,
        });
    },

    // Authentication endpoints
    "/api/v1/auth/signup": constructRoutes({
        POST: authController.signup,
    }),
    
    "/api/v1/auth/login": constructRoutes({
        POST: authController.login
    }),
    
    "/api/v1/auth/token": constructRoutes({
        POST: authController.token
    }),
    
    "/api/v1/auth/profile": constructRoutes({
        GET: constructHandler(authMiddleware, authController.getProfile)
    }),

    // World management endpoints
    "/api/v1/worlds": constructRoutes({
        GET: constructHandler(authMiddleware, worldsController.listWorlds),
        POST: constructHandler(authMiddleware, worldsController.createWorld)
    }),
    
    "/api/v1/worlds/:id": constructRoutes({
        GET: constructHandler(authMiddleware, worldsController.getWorld),
        DELETE: constructHandler(authMiddleware, worldsController.deleteWorld)
    }),
    
    "/api/v1/worlds/:id/export": constructRoutes({
        GET: constructHandler(authMiddleware, worldsController.exportWorld)
    }),
    
    "/api/v1/worlds/import": constructRoutes({
        POST: constructHandler(authMiddleware, worldsController.importWorld)
    }),

    // 404 handler for all other routes
    "/*": constructHandler()
};