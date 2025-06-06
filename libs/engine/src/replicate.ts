import ReplicateClient, { type FileOutput } from "replicate";

export async function generateImageFromPrompt(
    model: `${string}/${string}`,
    input: string,
    config: { apiKey?: string } = {}
): Promise<{ url: string; blob: Blob, buffer: Buffer }> {
    const replicateAPIKey = config.apiKey ?? process.env.REPLICATE_API_TOKEN;

    if (replicateAPIKey === undefined || replicateAPIKey === null) {
        throw new Error('Replicate API key is required');
    }

    const replicateClient = new ReplicateClient({ auth: replicateAPIKey });

    const response = await replicateClient.run(model, {
        input: { prompt: input }
    }) as FileOutput[];

    if (!response) {
        throw new Error('Failed to generate image');
    }

    const imgs = response.map(async file => {
        const blob = await file.blob();

        return {
            url: file.url(),
            blob: blob
        };
    });

    const images = await Promise.all(imgs);

    if (images.length === 0) {
        throw new Error('No images generated');
    }

    const image = images[0];

    if (!image || !image.url || !image.blob) {
        throw new Error('Invalid image response');
    }

    const buffer = Buffer.from(await image.blob.arrayBuffer());

    return {
        url: image.url.toString(),
        blob: image.blob,
        buffer
    }
}

export const Replicate = {
    generateImageFromPrompt
}