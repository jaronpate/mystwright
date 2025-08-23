import ReplicateClient, { type FileOutput } from "replicate";

export async function generateImageFromPrompt(
    model: `${string}/${string}`,
    input: string,
    config: { apiKey?: string, aspect_ratio?: string } = {}
): Promise<{ url: string; blob: Blob, mime: string, buffer: Buffer }> {
    const replicateAPIKey = config.apiKey ?? process.env.REPLICATE_API_TOKEN;

    if (replicateAPIKey === undefined || replicateAPIKey === null) {
        throw new Error('Replicate API key is required');
    }

    const replicateClient = new ReplicateClient({ auth: replicateAPIKey });

    const predictionInput: Record<string, any> = {
        prompt: input,
        guidance: 8,
        disable_safety_checker: true,
        go_fast: true
    }

    if (config.aspect_ratio) {
        predictionInput['aspect_ratio'] = config.aspect_ratio;
    }

    const response = await replicateClient.run(model, { input: predictionInput }) as FileOutput[];

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
        mime: image.blob.type,
        buffer
    }
}

export const Replicate = {
    generateImageFromPrompt
}