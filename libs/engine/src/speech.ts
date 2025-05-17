import { ElevenLabsClient } from "elevenlabs";
import { which } from "./util";
// Add child_process import for Node.js
import * as childProcess from 'child_process';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

const elevenlabs = new ElevenLabsClient({
    apiKey: ELEVENLABS_API_KEY,
});

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
        // Node.js implementation
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