import { db } from '@mystwright/db';
import { constructGameState, deserializeWorldStructure, getNextDialogueWithCharacter, type APIWorldResponse, type GameState } from '@mystwright/engine';
import type { APIRequest, AuthenticatedRequest } from '../utils/responses';
import { errorResponse, jsonResponse } from '../utils/responses';

export const gameplayController = {
    async generateNextCharacterDialogue(req: Request): Promise<Response> {
        try {
            const authReq = req as AuthenticatedRequest;
            const { input, character_id } = await req.json() as Record<string, any>;

            if (input === undefined || input === null) {
                return errorResponse('Input is required', req, 400);
            }

            const url = new URL(req.url);
            const pathParts = url.pathname.split('/');
            const worldId = pathParts[pathParts.length - 2];

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

            // TODO: Merge APIWorldResponse & WorldPayload
            const gameWorld = deserializeWorldStructure(world.payload as unknown as APIWorldResponse);

            const character = gameWorld.characters.get(character_id);

            if (character === undefined || character === null) {
                return errorResponse('Character not found', req, 404);
            }

            // Get the game state from the database
            const rawGameState = await db.selectFrom('game_states')
                .selectAll()
                .where('world_id', '=', worldId)
                .where('user_id', '=', authReq.user.id)
                .executeTakeFirst();

            if (rawGameState === undefined || rawGameState === null) {
                return errorResponse('Game state not found', req, 404);
            }

            // TODO: Validate this?
            const gameState = rawGameState.payload as unknown as GameState;

            // Generate the next character dialogue using the world and game state
            const { response, state } = await getNextDialogueWithCharacter(character, gameWorld, gameState, input);

            // Update the game state in the database
            await db.updateTable('game_states')
                .set({ payload: state })
                .where('world_id', '=', worldId)
                .where('user_id', '=', authReq.user.id)
                .execute();

            return jsonResponse({
                response,
                state
            }, req);
        } catch (error) {
            console.error('Generate next character dialogue error:', error);
            return errorResponse('Error generating next character dialogue', req, 500);
        }
    },

    async getGameState(req: APIRequest<'/api/v1/worlds/:world_id/states/:state_id'>): Promise<Response> {
        try {
            const authReq = req as AuthenticatedRequest;
            const worldId = req.params.world_id;
            const stateId = req.params.state_id;

            if (!worldId) {
                return errorResponse('World ID is required', req, 400);
            }
            
            const world = await db.selectFrom('worlds')
                .selectAll()
                .where('id', '=', worldId)
                .where('user_id', '=', authReq.user.id)
                .executeTakeFirst();

            if (!world) {
                return errorResponse('World not found', req, 404);
            }

            // Get game state from database
            const gameState = await db.selectFrom('game_states')
                .selectAll()
                .where('world_id', '=', worldId)
                .where('user_id', '=', authReq.user.id)
                .where('id', '=', stateId)
                .executeTakeFirst();

            if (gameState === undefined || gameState === null) {
                return errorResponse('Game state not found', req, 404);
            }

            return jsonResponse({ state: gameState }, req);
        } catch (error) {
            console.error('Get game state error:', error);
            return errorResponse('Error retrieving game state', req, 500);
        }
    },

    async createGameState(req: APIRequest<'/api/v1/worlds/:world_id/states'>): Promise<Response> {
        try {
            const authReq = req as AuthenticatedRequest;
            const worldId = req.params.world_id;

            if (!worldId) {
                return errorResponse('World ID is required', req, 400);
            }

            const world = await db.selectFrom('worlds')
                .selectAll()
                .where('id', '=', worldId)
                .where('user_id', '=', authReq.user.id)
                .executeTakeFirst();

            if (!world) {
                return errorResponse('World not found', req, 404);
            }

            const gameWorld = deserializeWorldStructure(world.payload as unknown as APIWorldResponse);
            const newGameState = constructGameState(gameWorld);

            // Create a new game state in the database
            const gameState = await db.insertInto('game_states')
                .values({
                    world_id: worldId,
                    user_id: authReq.user.id,
                    payload: newGameState
                })
                .returningAll()
                .executeTakeFirstOrThrow();

            return jsonResponse({ state: gameState }, req);
        }
        catch (error) {
            console.error('Create game state error:', error);
            return errorResponse('Error creating game state', req, 500);
        }
    },

    /**
     * Save the game state to the database
     */
    async saveGameState(req: APIRequest<'/api/v1/worlds/:world_id/states/:state_id'>): Promise<Response> {
        try {
            const authReq = req as AuthenticatedRequest;
            const url = new URL(req.url);
            const pathParts = url.pathname.split('/');
            const worldId = pathParts[pathParts.length - 2];

            if (!worldId) {
                return errorResponse('World ID is required', req, 400);
            }

            const { state } = await req.json() as Record<string, any>;

            if (state === undefined || state === null) {
                return errorResponse('State is required', req, 400);
            }

            // Save the game state to the database
            await db.updateTable('game_states')
                .set({ payload: state })
                .where('world_id', '=', worldId)
                .where('user_id', '=', authReq.user.id)
                .execute();

            return jsonResponse({ message: 'Game state saved successfully' }, req);
        } catch (error) {
            console.error('Save game state error:', error);
            return errorResponse('Error saving game state', req, 500);
        }
    }
}