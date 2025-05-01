import { ElevenLabsClient } from "elevenlabs";
import type { Character, ClueID, GameState, OpenRouterCompletionResponse, World } from "./types";
import { spawn } from "bun";
import { which } from "./util";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

const elevenlabs = new ElevenLabsClient({
    apiKey: ELEVENLABS_API_KEY,
});

export async function getNextDialogueWithCharacter(character: Character, world: World, state: GameState, input?: string, options: { model?: string; apiKey?: string } = {}): Promise<string> {
    if (character.role === 'victim') {
        return "You cannot speak with the victim.";
    }

    const apiKey = options.apiKey ?? OPENROUTER_API_KEY;

    if (!apiKey) {
        throw new Error('OpenRouter API key is required');
    }

    // Initialize dialogue history if it doesn't exist
    if (!state.dialogueHistory[character.id]) {
        state.dialogueHistory[character.id] = [];
    }

    const dialogueHistory = state.dialogueHistory[character.id]!;
    
    // Build the context for the dialogue
    let knownCluesDescription = null;
    if (character.knownClues && character.knownClues.length > 0) {
        knownCluesDescription = character.knownClues
            .map(clueId => {
                const clue = world.clues.get(clueId as ClueID);
                return clue ? clue.name : null;
            })
            .filter(Boolean)
            .join(', ');
    }
    
    const cluesFoundByPlayer = state.cluesFound
        .map(clueId => {
            const clue = world.clues.get(clueId);
            return clue ? clue.name : null;
        })
        .filter(Boolean)
        .join(', ');

    // Create prompt based on character role and context
    let prompt = `\
You are an AI roleplaying/method acting as a fictional character in a mystery-themed text adventure game. Stay fully in character—speak, think, and act like this character would. Do not refer to yourself as an AI or break the fourth wall.
Your role is to engage with the player as your character: share suspicions, ask questions, express doubts, notice details, and react naturally to clues or odd behavior.

There are some rules to follow:

- Stay grounded in the mystery's tone—whether noir, thriller, or cozy crime. Maintain emotional realism (e.g., anxiety, skepticism, anger, hesitation).
- Speak ONLY in the FIRST PERSON. This is vital. Only describe what your character says, thinks, feels, or directly perceives. You are not the narrator, game master, or environment.
- DO NOT refer to the digital world, game mechanics, or your own nature. Avoid generic phrases like "I think" or "I feel." Instead, express your character's thoughts and feelings directly.
- Speak as if you can and have seen and experienced the real world around you. Use specific details to enhance immersion.
- DO NOT describe your character's actions or thoughts in the third person. Use first-person language to convey your character's perspective.
- DO NOT add quotes or other formatting to your speech. Use plain text.

✅ “That bloodstain wasn't there before. You sure you locked the door?”
✅ “I can't shake the feeling someone's watching us.”
❌ “The character notices a clue on the floor.”
❌ “As an AI, I think the next step is…”

Be proactive—if the player stalls or seems uncertain, prompt them with ideas, pose questions, or draw attention to inconsistencies. Your goal is to help unravel the mystery through character-driven interaction.
You do not control the world, environment, or events. That is handled by the game master. Focus only on what your character says or feels.

You are ${character.name}. ${character.description}.
Your character's personality is ${character.personality}.
The mystery is: ${world.mystery.title}: ${world.mystery.description}.
You are a ${character.role} in this mystery.
The victim is: ${world.mystery.victim}
The crime is: ${world.mystery.crime}

Your alibi is: ${character.alibi ?? 'No alibi provided'}. 
You know about these clues: ${knownCluesDescription ?? 'No specific clues'}. 
The user has found these clues: ${cluesFoundByPlayer ?? 'No clues yet'}.\n`;
    
    // Customize prompt based on character role and player progress
    if (character.role === 'suspect') {
        prompt += `You should be evasive if the user mentions clues that might incriminate you,
        but remain in character and provide helpful information about what you know.
        If you have nothing to say, you can say you have nothing to add.
        If there is no existing conversation start by intoducing yourself to the user and asking how you can help.`;
    } else {
        // For witnesses
        prompt += `You should be helpful and provide information about what you know.
        If you have nothing to say, you can say you have nothing to add.
        If there is no existing conversation start by intoducing yourself to the user and asking how you can help`;
    }

    const messages = [
        {
            role: 'system',
            content: prompt
        },
        ...dialogueHistory
    ];

    if (input) {
        messages.push({
            role: 'user',
            content: input
        });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: options.model ?? 'google/gemini-2.0-flash-001',
            messages
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenRouter API error: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const data = await response.json() as OpenRouterCompletionResponse;

    if (data.error) {
        console.error('OpenRouter API error:', data.error);
        throw new Error(`OpenRouter API error: ${data.error.message}`);
    }

    if (!data.choices || !data.choices[0]?.message?.content) {
        throw new Error('Invalid response format from OpenRouter API');
    }

    if (input) {
        // Add the user input to the character's history
        dialogueHistory.push({
            role: 'user',
            content: input
        });
    }

    const newDialogue = data.choices[0].message.content;

    // Add the new dialogue to the character's history
    dialogueHistory.push({
        role: 'assistant',
        content: newDialogue
    });

    // Return the new dialogue
    return newDialogue;
}

export async function playVoiceForCharacter(character: Character, text: string): Promise<void> {
    if (which('ffplay') === null) {
        throw new Error('ffplay is not installed. Please install ffmpeg for voice streaming.');
    }
    
    const audio = await elevenlabs.generate({
        stream: true,
        voice: character.voice,
        voice_settings: {
            speed: 1.2,
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