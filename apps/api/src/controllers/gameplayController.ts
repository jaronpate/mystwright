import { db, sql } from '@mystwright/db';
import { getNextDialogueWithCharacter, createVoiceStreamForText } from '@mystwright/engine';
import { constructGameState, deserializeWorldStructure, type APIWorldResponse, type GameState } from '@mystwright/types';
import type { APIRequest, AuthenticatedRequest } from '../utils/responses';
import { errorResponse, jsonResponse } from '../utils/responses';

export const gameplayController = {
    async generateNextCharacterDialogue(req: APIRequest<'/api/v1/worlds/:world_id/states/:state_id/dialogue'>): Promise<Response> {
        try {
            const authReq = req as AuthenticatedRequest;
            const { input, character_id } = await req.json() as Record<string, any>;

            if (input === undefined || input === null) {
                return errorResponse('Input is required', req, 400);
            }

            const { world_id, state_id } = req.params

            if (!world_id) {
                return errorResponse('World ID is required', req, 400);
            }

            // Get world from database
            const world = await db.selectFrom('worlds')
                .selectAll()
                .where('id', '=', world_id)
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
                .where('id', '=', state_id)
                .where('world_id', '=', world_id)
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
                // .set({ payload: state })
                .set({
                    payload: sql`payload || CAST(${sql.val(state)} AS jsonb)`
                })
                .where('id', '=', state_id)
                .where('world_id', '=', world_id)
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

    async generateCharacterSpeech(req: APIRequest<'/api/v1/worlds/:world_id/speech'>): Promise<Response> {
        const authReq = req as AuthenticatedRequest;
        const { text, character_id } = await req.json() as Record<string, any>;
        
        if (text === undefined || text === null) {
            return errorResponse('Text is required', req, 400);
        }

        const { world_id } = req.params

        if (!world_id) {
            return errorResponse('World ID is required', req, 400);
        }

        // Get world from database
        const world = await db.selectFrom('worlds')
            .selectAll()
            .where('id', '=', world_id)
            .where('user_id', '=', authReq.user.id)
            .executeTakeFirst();

        if (!world) {
            return errorResponse('World not found', req, 404);
        }

        const gameWorld = deserializeWorldStructure(world.payload as unknown as APIWorldResponse);
        const character = gameWorld.characters.get(character_id);

        if (character === undefined || character === null) {
            return errorResponse('Character not found', req, 404);
        }

        const audio = await createVoiceStreamForText(character.voice, text);

        return new Response(audio, {
            headers: { 'Content-Type': 'audio/mpeg' }
        });
    },

    async listGameStates(req: APIRequest<'/api/v1/worlds/:world_id/states'>): Promise<Response> {
        try {
            const authReq = req as AuthenticatedRequest;
            const worldId = req.params.world_id;

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

            // Get game states from database
            const gameStates = await db.selectFrom('game_states')
                .selectAll()
                .where('world_id', '=', worldId)
                .where('user_id', '=', authReq.user.id)
                .orderBy('created_at', 'desc')
                .execute();
            
            return jsonResponse({ states: gameStates }, req);
        } catch (error) {
            console.error('List game states error:', error);
            return errorResponse('Error retrieving game states', req, 500);
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
    async updateGameState(req: APIRequest<'/api/v1/worlds/:world_id/states/:state_id'>): Promise<Response> {
        try {
            const authReq = req as AuthenticatedRequest;
            const { world_id } = req.params;

            if (!world_id) {
                return errorResponse('World ID is required', req, 400);
            }

            const { payload } = await req.json() as Record<string, any>;

            if (payload === undefined || payload === null) {
                return errorResponse('State payload is required', req, 400);
            }

            // Save the game state to the database
            await db.updateTable('game_states')
                .set({ payload })
                .set({
                    payload: sql`payload || CAST(${sql.val(payload)} AS jsonb)`
                })
                .where('world_id', '=', world_id)
                .where('user_id', '=', authReq.user.id)
                .execute();

            return jsonResponse({ message: 'Game state saved successfully' }, req);
        } catch (error) {
            console.error('Save game state error:', error);
            return errorResponse('Error saving game state', req, 500);
        }
    },

    async deleteGameState(req: APIRequest<'/api/v1/worlds/:world_id/states/:state_id'>): Promise<Response> {
        try {
            const authReq = req as AuthenticatedRequest;
            const worldId = req.params.world_id;
            const stateId = req.params.state_id;

            if (!worldId) {
                return errorResponse('World ID is required', req, 400);
            }

            // Delete the game state from the database
            await db.deleteFrom('game_states')
                .where('world_id', '=', worldId)
                .where('user_id', '=', authReq.user.id)
                .where('id', '=', stateId)
                .execute();

            return jsonResponse({ message: 'Game state deleted successfully' }, req);
        } catch (error) {
            console.error('Delete game state error:', error);
            return errorResponse('Error deleting game state', req, 500);
        }
    }
}