import ReplicateClient, { type FileOutput } from "replicate";

type GenerateImageConfig = {
    input: string;
    aspect_ratio: string;
}

type GenerateImageOutput = {
    url: string;
    blob: Blob;
}

const GoogleImagenFormating = {
    input: ({ input, aspect_ratio}: GenerateImageConfig) => ({
        prompt: input,
        aspect_ratio: aspect_ratio,
        output_format: "png",
        safety_filter_level: "block_only_high"
    }),
    output: async (file: FileOutput): Promise<GenerateImageOutput[]> => {
        return [{
            url: file.url().toString(),
            blob: await file.blob()
        }];
    }
}

const imageModelsMapping = {
    'google/imagen-3-fast': GoogleImagenFormating,
    'google/imagen-4-ultra': GoogleImagenFormating,
    'black-forest-labs/flux-schnell': {
        input: ({ input, aspect_ratio}: GenerateImageConfig) => ({
            input: input,
            guidance: 8,
            disable_safety_checker: true,
            go_fast: true
        }),
        output: async (response: FileOutput[]): Promise<GenerateImageOutput[]> => {
            const imgs = response.map(async (file) => ({
                url: file.url().toString(),
                blob: await file.blob()
            }));

            return Promise.all(imgs);
        }
    }
}

export async function generateImageFromPrompt(
    model: `${string}/${string}`,
    input: string,
    config: { apiKey?: string, aspect_ratio?: string } = {}
): Promise<{ url: string; blob: Blob, mime: string, buffer: Buffer }> {
    const replicateAPIKey = config.apiKey ?? process.env.REPLICATE_API_TOKEN;

    if (replicateAPIKey === undefined || replicateAPIKey === null) {
        throw new Error('Replicate API key is required');
    }

    if (!config.aspect_ratio) {
        config.aspect_ratio = '1:1';
    }

    const replicateClient = new ReplicateClient({ auth: replicateAPIKey, useFileOutput: true });

    const predictionInput: Record<string, any> = {};

    const modelConfig = imageModelsMapping[model as keyof typeof imageModelsMapping];

    if (model in imageModelsMapping) {
        Object.assign(predictionInput, modelConfig.input({ input, aspect_ratio: config.aspect_ratio }));
    } else {
        throw new Error(`Model ${model} is not configured for image generation`);
    }

    console.log('Generating image with model:', model);
    console.log('Prediction input:', predictionInput);

    const response = await replicateClient.run(model, { input: predictionInput }) as FileOutput[];

    if (!response) {
        throw new Error('Failed to generate image');
    }

    // @ts-ignore we know this is the correct type here based on the model mapping
    const images = await modelConfig.output(response);

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

export async function generateAudioStreamFromText(
    model: `${string}/${string}`,
    input: string,
    config: { apiKey?: string } = {}
): Promise<ReadableStream<Uint8Array>> {
    const replicateAPIKey = config.apiKey ?? process.env.REPLICATE_API_TOKEN;

    if (replicateAPIKey === undefined || replicateAPIKey === null) {
        throw new Error('Replicate API key is required');
    }

    const modelInput = { 
        prompt: input,
        temperature: 1.25,
        exaggeration: 0.75,
        cfg_weight: 0.25
    }

    const replicateClient = new ReplicateClient({ auth: replicateAPIKey, useFileOutput: true });

    const response = await replicateClient.run(model, { input: modelInput }) as FileOutput;

    if (!response) {
        throw new Error('Failed to generate audio');
    }

    const audioBlob = await response.blob();

    if (!audioBlob) {
        throw new Error('Invalid audio response');
    }

    return audioBlob.stream();
}

export const Replicate = {
    generateImageFromPrompt
}