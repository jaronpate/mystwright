import { spawn } from "bun";
import { ElevenLabsClient } from "elevenlabs";
import type { Character } from "./types";
import { which } from "./util";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

const elevenlabs = new ElevenLabsClient({
    apiKey: ELEVENLABS_API_KEY,
});

export async function playVoiceForCharacter(character: Character, text: string): Promise<void> {
    if (which('ffplay') === null) {
        throw new Error('ffplay is not installed. Please install ffmpeg for voice streaming.');
    }
    
    const audio = await elevenlabs.generate({
        stream: true,
        voice: character.voice,
        voice_settings: {
            speed: 1.15,
            stability: 0.3
        },
        text,
        apply_text_normalization: 'on',
        model_id: 'eleven_multilingual_v2'
        // model_id: 'eleven_flash_v2_5'
    });

    const proc = spawn(['ffplay', '-autoexit', '-nodisp', '-'], {
        stdin: 'pipe',
        stdout: 'ignore',
        stderr: 'ignore'
    });

    for await (const chunk of audio) {
        proc.stdin.write(chunk);
    }

    proc.stdin.end();

    await proc.exited;

    return;
}