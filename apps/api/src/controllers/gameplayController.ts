import { db } from '@mystwright/db';
import { errorResponse, jsonResponse } from '../utils/responses';
import type { AuthenticatedRequest } from '../middleware/auth';
import { getNextDialogueWithCharacter, deserializeWorldStructure, constructGameState, type APIWorldResponse, type GameState } from '@mystwright/engine';

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

            return jsonResponse({
                response,
                state
            }, req);
        } catch (error) {
            console.error('Generate next character dialogue error:', error);
            return errorResponse('Error generating next character dialogue', req, 500);
        }
    },

    async getGameState(req: Request): Promise<Response> {
        try {
            const authReq = req as AuthenticatedRequest;
            const url = new URL(req.url);
            const pathParts = url.pathname.split('/');
            const worldId = pathParts[pathParts.length - 2];

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

            // TODO: Merge APIWorldResponse & WorldPayload
            const gameWorld = deserializeWorldStructure(world.payload as unknown as APIWorldResponse);

            // Get game state from database
            let gameState = await db.selectFrom('game_states')
                .selectAll()
                .where('world_id', '=', worldId)
                .where('user_id', '=', authReq.user.id)
                .executeTakeFirst();

            // If no game state is found, create a new one
            if (gameState === undefined || gameState === null) {
                const newGameState = constructGameState(gameWorld);

                gameState = await db.insertInto('game_states')
                    .values({
                        world_id: worldId,
                        user_id: authReq.user.id,
                        payload: newGameState
                    })
                    .returningAll()
                    .executeTakeFirstOrThrow();
            }

            return jsonResponse({ state: gameState }, req);
        } catch (error) {
            console.error('Get game state error:', error);
            return errorResponse('Error retrieving game state', req, 500);
        }
    },

    /**
     * Save the game state to the database
     */
    async saveGameState(req: Request): Promise<Response> {
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