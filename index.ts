import { constructWorldStructure, constructGameState } from './src/generation';
import type { APIWorldResponse, GameState, World } from './src/types';
import { renderMystwrightTUI } from './ui';

async function gameLoop(world: World, state: GameState) {
    renderMystwrightTUI(world, state);
}

// const world = await generateWorld();

const testData = await import('./gens/The Art of Deception.json') as unknown as APIWorldResponse;
const world = constructWorldStructure(testData);

const state = constructGameState(world);
await gameLoop(world, state);