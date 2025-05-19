import { db, type NewWorld, type WorldPayload } from '@mystwright/db';
import { generateWorld } from '@mystwright/engine';
import { serializeWorldStructure } from '@mystwright/types';
import type { APIRequest, AuthenticatedRequest } from '../utils/responses';
import { errorResponse, jsonResponse } from '../utils/responses';

/**
 * Controller for world management operations
 */
export const worldsController = {
    /**
     * Generate and save a new world
     */
    async createWorld(req: Request): Promise<Response> {
        try {
            const authReq = req as AuthenticatedRequest;
            const { payload } = await req.json() as Record<string, any>;
            
            // Generate a new world using the engine
            const world = await generateWorld();
            
            // Create new world in the database
            const newWorld: NewWorld = {
                user_id: authReq.user.id,
                title: world.mystery.title,
                description: world.mystery.description || null,
                // TODO: Merge APIWorldResponse & WorldPayload
                payload: serializeWorldStructure(world) as unknown as WorldPayload
            };
            
            const createdWorld = await db.insertInto('worlds')
                .values(newWorld)
                .returningAll()
                .executeTakeFirst();
                
            return jsonResponse({
                message: 'World created successfully',
                world: createdWorld
            }, req, 201);
        } catch (error) {
            console.error('World creation error:', error);
            return errorResponse('Error during world creation', req, 500);
        }
    },
    
    /**
     * Get all worlds for the current user
     */
    async listWorlds(req: Request): Promise<Response> {
        try {
            const authReq = req as AuthenticatedRequest;
            
            // Get worlds from database
            const worlds = await db.selectFrom('worlds')
                .selectAll()
                .where('user_id', '=', authReq.user.id)
                .orderBy('created_at', 'desc')
                .execute();
                
            return jsonResponse({ worlds }, req);
        } catch (error) {
            console.error('List worlds error:', error);
            return errorResponse('Error retrieving worlds', req, 500);
        }
    },
    
    /**
     * Get a specific world by ID
     */
    async getWorld(req: APIRequest<'/api/v1/worlds/:world_id'>): Promise<Response> {
        try {
            const authReq = req as AuthenticatedRequest;
            const worldId = req.params.world_id
            
            if (!worldId) {
                return errorResponse('World ID is required', req, 400);
            }
            
            // Get world from database
            const world = await db.selectFrom('worlds')
                .selectAll()
                .where('id', '=', worldId)
                .where('user_id', '=', authReq.user.id)
                .executeTakeFirst();
                
            if (!world) {
                return errorResponse('World not found', req, 404);
            }
            
            return jsonResponse({ world }, req);
        } catch (error) {
            console.error('Get world error:', error);
            return errorResponse('Error retrieving world', req, 500);
        }
    },
    
    /**
     * Delete a world by ID
     */
    async deleteWorld(req: APIRequest<'/api/v1/worlds/:world_id'>): Promise<Response> {
        try {
            const authReq = req as AuthenticatedRequest;
            const worldId = req.params.world_id
            
            if (!worldId) {
                return errorResponse('World ID is required', req, 400);
            }
            
            // Ensure world exists and belongs to user
            const worldExists = await db.selectFrom('worlds')
                .select('id')
                .where('id', '=', worldId)
                .where('user_id', '=', authReq.user.id)
                .executeTakeFirst();
                
            if (!worldExists) {
                return errorResponse('World not found', req, 404);
            }
            
            // Delete world from database
            await db.deleteFrom('worlds')
                .where('id', '=', worldId)
                .execute();
                
            return jsonResponse({
                message: 'World deleted successfully'
            }, req);
        } catch (error) {
            console.error('Delete world error:', error);
            return errorResponse('Error deleting world', req, 500);
        }
    },
    
    /**
     * Export a world as JSON
     */
    async exportWorld(req: APIRequest<'/api/v1/worlds/:world_id/export'>): Promise<Response> {
        try {
            const authReq = req as AuthenticatedRequest;
            const worldId = req.params.world_id
            
            if (!worldId) {
                return errorResponse('World ID is required', req, 400);
            }
            
            // Get world from database
            const world = await db.selectFrom('worlds')
                .selectAll()
                .where('id', '=', worldId)
                .where('user_id', '=', authReq.user.id)
                .executeTakeFirst();
                
            if (!world) {
                return errorResponse('World not found', req, 404);
            }
            
            // Return world payload without database metadata
            return jsonResponse({
                title: world.title,
                description: world.description,
                world: world.payload
            }, req);
        } catch (error) {
            console.error('Export world error:', error);
            return errorResponse('Error exporting world', req, 500);
        }
    },
    
    /**
     * Import a world from JSON
     */
    async importWorld(req: Request): Promise<Response> {
        try {
            const authReq = req as AuthenticatedRequest;
            const { title, description, world } = await req.json() as Record<string, any>;
            
            // Basic validation
            if (!title || !world) {
                return errorResponse('Title and world data are required', req, 400);
            }
            
            // Validate world data structure
            // This is a simplified validation - in a real app, you'd want more thorough validation
            if (!world.locations || !world.characters || !world.clues || !world.mystery || !world.solution) {
                return errorResponse('Invalid world data structure', req, 400);
            }
            
            // Create new world in the database
            const newWorld: NewWorld = {
                user_id: authReq.user.id,
                title,
                description: description || null,
                payload: world
            };
            
            const createdWorld = await db.insertInto('worlds')
                .values(newWorld)
                .returningAll()
                .executeTakeFirst();
                
            return jsonResponse({
                message: 'World imported successfully',
                world: createdWorld
            }, req, 201);
        } catch (error) {
            console.error('Import world error:', error);
            return errorResponse('Error importing world', req, 500);
        }
    }
};