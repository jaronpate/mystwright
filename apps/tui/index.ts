import { constructWorldStructure, constructGameState, generateWorld } from '@mystwright/engine';
import type { APIWorldResponse, GameState, World } from '@mystwright/engine';
import { renderMystwrightTUI } from './ui';

// const world = await generateWorld();

// const testData = await import('../../gens/The Art of Deception/world.json') as unknown as APIWorldResponse;
const testData = await import('../../gens/The GenTech Labs Conspiracy/world.json') as unknown as APIWorldResponse;
const world = constructWorldStructure(testData);

const state = constructGameState(world);

async function gameLoop(world: World, state: GameState) {
    renderMystwrightTUI(world, state);
}

await gameLoop(world, state);