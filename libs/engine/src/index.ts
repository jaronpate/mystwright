export * from './generation';
export * from './speech';
export * from './util';
export * from './replicate';

// for testing --- local use only
// Generate character images for all characters in a world
// (async () => {
//     const { deserializeWorldStructure } = await import('../../types');
//     const { generateImageStyleSeed, generateCharacterImage } = await import('./generation');
//     const { writeRelative } = await import('./util');

//     const worldName = 'The GenTech Labs Conspiracy';

//     const world = deserializeWorldStructure(await import(`../../../gens/${worldName}/world.json`));

//     const seed = await generateImageStyleSeed(world);

//     console.log('Generated style seed:');
//     console.log(seed);

//     for (const character of world.characters.values()) {
//         console.log(`Generating image for character ${character.name} (${character.id})`);
//         const { buffer, mime } = await generateCharacterImage(world, character, seed);
//         console.log('Generated character image');
//         await writeRelative(
//             import.meta.url,
//             `../../../gens/${worldName}/imgs/characters/${character.id}-character-image.${mime.split('/')[1]}`,
//             buffer
//         );
//     }
// })().catch((error) => {
//     console.error('Error initializing engine module:', error);
// });