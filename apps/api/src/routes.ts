import { authController } from './controllers/authController';
import { gameplayController } from './controllers/gameplayController';
import { worldsController } from './controllers/worldsController';
import { authMiddleware } from './middleware/auth';
import { getCorsHeaders } from './utils/cors';
import type { APIRequest } from './utils/responses';
import { jsonResponse, optionsResponse } from './utils/responses';

type Handler<T extends string = string> = (req: APIRequest<T>) => Promise<APIRequest<T> | Response> | APIRequest<T> | Response;
type ResponseHandler<T extends string = string> = (req: APIRequest<T>) => Promise<Response> | Response;

type RouteDefinition<T extends string = string> = Partial<Record<'GET' | 'POST' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD', Array<Handler<T>> | Handler<T>>>;
type Route<T extends string = string> = Partial<Record<'GET' | 'POST' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD', ResponseHandler<T>>>;

/**
 * Constructs a route object with default OPTIONS method for CORS preflight requests
 * @param methods - Object with HTTP methods as keys and handler functions as values
 * @returns A route object for use in `Bun.serve()`
 */
const constructRoute = <T extends string = string>(methods?: RouteDefinition<T>): Route<T> => {
    const routes: Route<T> = {
        OPTIONS: optionsResponse<T>
    }

    if (methods) {
        for (const [method, handlerOrHandlers] of Object.entries(methods)) {
            const handlers = Array.isArray(handlerOrHandlers) ? handlerOrHandlers : [handlerOrHandlers];
            routes[method as keyof Route<T>] = constructHandler<T>(...handlers);
        }
    }

    return routes;
}

/**
 * Constructs a route handler that processes a request through multiple handlers
 * @param handlers - Array of request handlers
 * @returns A function that processes the request through the handlers
 * If a handler returns a response, it is returned immediately.
 * If no handler returns a response, a 404 Not Found response is returned.
 */
const constructHandler = <T extends string = string>(...handlers: Array<Handler<T>>) => {
    return async (req: APIRequest<T>) => {
        let request = req;
        for (const handler of handlers) {
            const response = await handler(request);
            if (response instanceof Response) {
                return response;
            } else {
                response.params = request.params;
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
    '/api/status': (req: Request) => {
        return new Response("OK", {
            headers: getCorsHeaders(req),
            status: 200,
        });
    },

    // Authentication endpoints
    '/api/v1/auth/signup': constructRoute({
        POST: authController.signup,
    }),
    
    '/api/v1/auth/login': constructRoute({
        POST: authController.login
    }),
    
    '/api/v1/auth/token': constructRoute({
        POST: authController.token
    }),
    
    '/api/v1/auth/profile': constructRoute({
        GET: [authMiddleware, authController.getProfile]
    }),

    // World management endpoints
    '/api/v1/worlds': constructRoute({
        GET: [authMiddleware, worldsController.listWorlds],
        POST: [authMiddleware, worldsController.createWorld]
    }),
    
    '/api/v1/worlds/:world_id': constructRoute<'/api/v1/worlds/:world_id'>({
        GET: [authMiddleware, worldsController.getWorld],
        DELETE: [authMiddleware, worldsController.deleteWorld]
    }), 
    
    '/api/v1/worlds/:world_id/export': constructRoute<'/api/v1/worlds/:world_id/export'>({
        GET: [authMiddleware, worldsController.exportWorld]
    }),
    
    '/api/v1/worlds/import': constructRoute({
        POST: [authMiddleware, worldsController.importWorld]
    }),

    // Gameplay endpoints
    '/api/v1/worlds/:world_id/states': constructRoute<'/api/v1/worlds/:world_id/states'>({
        GET: [authMiddleware, gameplayController.listGameStates],
        POST: [authMiddleware, gameplayController.createGameState]
    }),
    
    '/api/v1/worlds/:world_id/states/:state_id': constructRoute<'/api/v1/worlds/:world_id/states/:state_id'>({
        GET: [authMiddleware, gameplayController.getGameState],
        PATCH: [authMiddleware, gameplayController.updateGameState],
        DELETE: [authMiddleware, gameplayController.deleteGameState]
    }),
    
    '/api/v1/worlds/:world_id/states/:state_id/dialogue': constructRoute<'/api/v1/worlds/:world_id/states/:state_id/dialogue'>({
        POST: [authMiddleware, gameplayController.generateNextCharacterDialogue]
    }),

    // 404 handler for all other routes
    // TODO: Fix Route<T> type to allow for this definition
    // '/*': []
};