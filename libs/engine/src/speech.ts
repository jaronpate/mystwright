import { ElevenLabsClient } from "elevenlabs";
import { which } from "./util";
import type { Readable } from "stream";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

const elevenlabs = new ElevenLabsClient({
    apiKey: ELEVENLABS_API_KEY,
});

function toWebReadableStream(nodeReadable: Readable): ReadableStream<Uint8Array> {
    return new ReadableStream({
        start(controller) {
            nodeReadable.on('data', (chunk) => controller.enqueue(new Uint8Array(chunk)));
            nodeReadable.on('end', () => controller.close());
            nodeReadable.on('error', (err) => controller.error(err));
        },
        cancel() {
            nodeReadable.destroy();
        }
    });
}

// export async function createVoiceStreamForText(voice: string, text: string): Promise<Readable | ReadableStream<Uint8Array>> {
export async function createVoiceStreamForText(voice: string, text: string): Promise<ReadableStream<Uint8Array>> {
    try {
        // TODO: This returns a 400? No error message though
        // const audio = await elevenlabs.textToSpeech.convertAsStream(voice, {
        //     text,
        //     voice_settings: {
        //         speed: 1.15,
        //         stability: 0.3
        //     },
        //     apply_text_normalization: 'on',
        //     // TODO: Idk what is best here and if this is needed?
        //     // output_format: 'mp3_44100_128',
        //     model_id: 'eleven_multilingual_v2'
        //     // model_id: 'eleven_flash_v2_5'
        // });

        const audio = await elevenlabs.generate({
            stream: true,
            voice: voice,
            voice_settings: {
                speed: 1.15,
                stability: 0.3
            },
            text,
            apply_text_normalization: 'on',
            model_id: 'eleven_multilingual_v2'
            // model_id: 'eleven_flash_v2_5'
        });

        return audio as unknown as ReadableStream<Uint8Array>;
    } catch (error) {
        console.error('Error creating voice stream:', error);
        throw new Error('Failed to create voice stream');
    }
}

export async function playVoiceForText(voice: string, text: string): Promise<void> {
    if (which('ffplay') === null) {
        throw new Error('ffplay is not installed. Please install ffmpeg for voice streaming.');
    }
    
    const audio = await elevenlabs.generate({
        stream: true,
        voice: voice,
        voice_settings: {
            speed: 1.15,
            stability: 0.3
        },
        text,
        apply_text_normalization: 'on',
        model_id: 'eleven_multilingual_v2'
        // model_id: 'eleven_flash_v2_5'
    });
    
    if (Bun !== null && Bun !== undefined) {
        // Bun implementation
        const proc = Bun.spawn(['ffplay', '-autoexit', '-nodisp', '-'], {
            stdin: 'pipe',
            stdout: 'ignore',
            stderr: 'ignore'
        });
        
        for await (const chunk of audio) {
            proc.stdin.write(chunk);
        }
        
        proc.stdin.end();
        
        await proc.exited;
    } else {
        const childProcess = await import('child_process');
        const proc = childProcess.spawn('ffplay', ['-autoexit', '-nodisp', '-'], {
            stdio: ['pipe', 'ignore', 'ignore']
        });
        
        for await (const chunk of audio) {
            proc.stdin.write(chunk);
        }
        
        proc.stdin.end();
        
        // Create a promise that resolves when the process exits
        await new Promise<void>((resolve, reject) => {
            proc.on('exit', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`ffplay exited with code ${code}`));
                }
            });
            proc.on('error', reject);
        });
    }

    return;
}