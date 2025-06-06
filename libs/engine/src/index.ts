export * from './generation';
export * from './speech';
export * from './util';
export * from './replicate';

(async () => {
    const { generateClueImage } = await import('./generation');
    const image = await generateClueImage({}, {
        name: 'Conference Ticket',
        description: `A plane ticket confirming Dr. Alvarez's attendance at a conference in Zurich.`,
    });

    console.log('Generated image:');
    console.log(image);
    // console.log(JSON.stringify(image, null, 4));
}
)().catch((error) => {
    console.error('Error initializing engine module:', error);
});