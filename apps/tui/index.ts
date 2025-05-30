import { generateWorld } from '@mystwright/engine';
import { constructGameState, deserializeWorldStructure } from '@mystwright/types';
import type { WorldPayload, GameState, World } from '@mystwright/types';
import { renderMystwrightTUI } from './ui';

// const world = await generateWorld();

const testData = await import('../../gens/The Art of Deception/world.json') as unknown as WorldPayload;
// const testData = await import('../../gens/The GenTech Labs Conspiracy/world.json') as unknown as WorldPayload;
const world = deserializeWorldStructure(testData);

const state = constructGameState(world);

async function gameLoop(world: World, state: GameState) {
    renderMystwrightTUI(world, state);
}

await gameLoop(world, state);