import { constructWorldStructure, constructGameState, generateWorld, generateClueImage } from './src/generation';
import type { APIWorldResponse, GameState, World } from './src/types';
import { renderMystwrightTUI } from './src/tui';
import { writeRelative } from './src/util';

// const world = await generateWorld();

// const testData = await import('./gens/The Art of Deception/world.json') as unknown as APIWorldResponse;
const testData = await import('./gens/The GenTech Labs Conspiracy/world.json') as unknown as APIWorldResponse;
const world = constructWorldStructure(testData);

// const img = await generateClueImage(Array.from(world.clues.values())[1]!);
// await writeRelative(import.meta.url, 'src/gens/The GenTech Labs Conspiracy/clue.png', img);

const state = constructGameState(world);

let listeners: (() => void)[] = [];

async function gameLoop(world: World, state: GameState) {
    renderMystwrightTUI(world, state);
}

await gameLoop(world, state);