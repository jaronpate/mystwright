import type {
    Character,
    Clue,
    ClueID,
    GameState,
    Memory,
    Message,
    ValidationError,
    ValidationResult,
    World,
    WorldPayload,
} from '@mystwright/types';
import {
    DEFAULT_WEAK_MODEL,
    deserializeWorldStructure,
    JUDGE_CHARACTER_ID,
    JUDGE_VOICE,
    WorldValidationError,
} from '@mystwright/types';
import { ElevenLabsClient } from 'elevenlabs';
import OpenAI from 'openai';
import { OpenRouter } from './openrouter';
import { generateImageFromPrompt } from './replicate';
import { writeRelative } from './util';

const openai = new OpenAI();
const elevenlabs = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

// Constants
const MAX_GENERATION_ATTEMPTS = 5;
const GENERATION_TEMPERATURE = 1.5; // 0-2, higher values = more creative
const VERBOSITY = 'high'; // 'low' | 'medium' | 'high'

// Schema for world generation
const WORLD_GENERATION_SCHEMA = {
    name: 'mystery',
    strict: true,
    schema: {
        type: 'object',
        properties: {
            locations: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        connectedLocations: {
                            type: 'array',
                            items: { type: 'string' },
                        },
                        clues: {
                            type: 'array',
                            items: { type: 'string' },
                        },
                        characters: {
                            type: 'array',
                            items: { type: 'string' },
                        },
                    },
                    required: ['id', 'name', 'description', 'connectedLocations', 'clues', 'characters'],
                    additionalProperties: false,
                },
            },
            characters: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        personality: { type: 'string' },
                        voice: { type: 'string' },
                        role: {
                            type: 'string',
                            enum: ['suspect', 'witness', 'victim'],
                        },
                        alibi: { type: ['string', 'null'] },
                        knownClues: {
                            type: 'array',
                            items: { type: 'string' },
                        },
                    },
                    required: ['id', 'name', 'description', 'personality', 'voice', 'role', 'alibi', 'knownClues'],
                    additionalProperties: false,
                },
            },
            clues: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        type: {
                            type: 'string',
                            enum: ['physical', 'testimony', 'other'],
                        },
                    },
                    required: ['id', 'name', 'description', 'type'],
                    additionalProperties: false,
                },
            },
            mystery: {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    shortDescription: { type: 'string' },
                    victim: { type: 'string' },
                    crime: { type: 'string' },
                    time: { type: 'string' },
                    location_id: { type: 'string' },
                },
                required: ['title', 'description', 'shortDescription', 'victim', 'crime', 'time', 'location_id'],
                additionalProperties: false,
            },
            solution: {
                type: 'object',
                properties: {
                    culpritId: { type: 'string' },
                    motive: { type: 'string' },
                    method: { type: 'string' },
                },
                required: ['culpritId', 'motive', 'method'],
                additionalProperties: false,
            },
        },
        required: ['locations', 'characters', 'clues', 'mystery', 'solution'],
        additionalProperties: false,
    },
};

/**
 * Builds the available voices string for world generation prompts
 */
async function buildAvailableVoicesString(): Promise<string> {
    const { voices } = await elevenlabs.voices.getAll();
    let availableVoices = `Available voices:\n\n`;

    for (const voice of voices) {
        if (voice.name === JUDGE_VOICE) {
            continue; // Skip the voice used for the judge
        }

        const supportsMultilingualV2 = voice.high_quality_base_model_ids?.includes('eleven_multilingual_v2');
        const supportsFlashV2 = voice.high_quality_base_model_ids?.includes('eleven_flash_v2_5');

        if (voice.labels && supportsMultilingualV2 && supportsFlashV2) {
            availableVoices += `Voice ID: ${voice.voice_id}\nVoice Name: ${voice.name}\nVoice Labels: ${voice.labels.gender}, ${voice.labels.accent}, ${voice.labels.description}, ${voice.labels.age}\n\n`;
        }
    }

    return availableVoices;
}

/**
 * Builds the system prompt for world generation
 */
function buildWorldGenerationSystemPrompt(availableVoices: string): string {
    return `\
You are Mystwright, a game master for a mystery text adventure.

You generate vivid descriptions and guide the user through a mystery, revealing clues gradually and never giving away the solution outright

Your purpose is to create structured, solvable mystery scenarios. Keep them clever and ensure the user can deduce the solution from the clues provided.
Do not however make it too easy. There should be some locations and clues that are red herrings or not directly related to the solution. The user should have to think critically and piece together the clues to arrive at the correct conclusion.
The mystery should be engaging and immersive, with a well-defined setting and characters. The clues should be diverse and interesting, including physical evidence, testimonies, and documents. The characters should have distinct personalities and motives, adding depth to the story.
We don't want it to be immediately obvious but once solved should be plausable and make sense.

Each mystery must include:
- One crime (e.g., murder, theft, kidnapping)
- One victim
- One culprit
- 8-10 characters (suspects, witnesses, the culprit, the victim)
- 5-8 locations (crime scene, suspect homes, public spaces)
- 15-20 clues (physical evidence, testimonies, documents, etc)

Rules:
- MINIMUM of 8 Characters
- MINIMUM of 5 locations
- MINIMUM of 15 clues
- Every mystery must be internally consistent.
- Only one character should be the true culprit.
- The mystery must be solvable based on the available clues.
- Characters must have logical motives and alibis where appropriate.
- Locations must be meaningfully connected.
- Clues must link back to characters, locations, or events in the story.
- All IDs must be valid and cross-referenced correctly.
- You must only output a valid JSON object matching the schema provided. No explanations or prose outside the JSON.
- For each character select an appropriate voice based on the info provided about the voice and the personality and description given to the character. Provide the 'Voice ID' for the selected voice in the JSON output.
- There should be multiple ways to solve the mystery, but only one correct solution.
- The character id ${JUDGE_CHARACTER_ID} is reserved. Do not use it for any of characters you create.
- The shortDescription field should be a single sentence.

${availableVoices}

Tone and inspiration: grounded, deductive, and in the spirit of classic detective fiction like Sherlock Holmes and Agatha Christie.
    `;
}

/**
 * Creates validation error feedback message from ValidationResult
 */
function createValidationErrorFeedback(validationResult: ValidationResult): string {
    let missingContent = '';

    // Process each validation error to provide specific guidance
    for (const error of validationResult.errors) {
        if (error.type === 'INSUFFICIENT_COUNT') {
            missingContent += `- ${error.suggestion}\n`;
        } else if (error.type === 'INVALID_REFERENCE') {
            missingContent += `- FIX invalid references: ${error.message}\n`;
            missingContent += `  ${error.suggestion}\n`;
        } else if (error.type === 'MISSING_CULPRIT') {
            missingContent += `- FIX culprit reference: ${error.suggestion}\n`;
        } else if (error.type === 'MISSING_STRUCTURE') {
            missingContent += `- FIX structural issue: ${error.message}\n`;
            missingContent += `  ${error.suggestion}\n`;
        } else {
            // Generic fallback for any unrecognized error
            missingContent += `- FIX: ${error.message}\n`;
            if (error.suggestion) {
                missingContent += `  ${error.suggestion}\n`;
            }
        }
    }

    // Fallback if no specific issues were processed
    if (!missingContent && validationResult.errors.length > 0) {
        missingContent = validationResult.errors.map(error => `- FIX: ${error.message}`).join('\n') + '\n';
    }

    return missingContent;
}

/**
 * Creates the retry prompt for world generation improvements
 */
function createRetryPrompt(missingContent: string): string {
    return `\
Your mystery world is good but needs some additions. Please ADD TO the existing world (don't replace it):

${missingContent}

Important instructions:
1. Keep ALL existing content (characters, locations, clues, mystery details)
2. Maintain consistency with the existing story, title, and theme
3. Make sure new elements connect logically with existing ones
4. Make sure all IDs are unique and all references are valid
5. Return the COMPLETE JSON with both existing and new content combined

Your response should be a single, complete JSON object containing the original content plus the new additions.`;
}

/**
 * Generates a mystery and world by sending a request to OpenRouter's API
 * using structured JSON output format. If validation fails, it will
 * request more content from the model until we have a valid world.
 * @param config - Optional configuration object with API key and model
 */
export async function generateWorld(config: { model?: string } = {}): Promise<World> {
    const availableVoices = await buildAvailableVoicesString();
    const systemPrompt = buildWorldGenerationSystemPrompt(availableVoices);

    const worldGenerationPrompt = `Create a mystery with a modern mystery novel tone`;

    let attempts = 0;
    let worldJson: WorldPayload | null = null;
    let previousMessages: Array<Message> = [
        {
            role: 'system',
            content: systemPrompt,
        },
        {
            role: 'user',
            content: worldGenerationPrompt,
        },
    ];
    let validationError: Error | null = null;

    while (attempts < MAX_GENERATION_ATTEMPTS) {
        attempts++;
        console.log(`Attempt ${attempts} of ${MAX_GENERATION_ATTEMPTS} to generate valid world`);

        try {
            // Parse the JSON content from the response
            worldJson = (await OpenRouter.generateCompletion(config.model ?? DEFAULT_WEAK_MODEL, previousMessages, {
                schema: WORLD_GENERATION_SCHEMA,
                temperature: GENERATION_TEMPERATURE,
                verbosity: VERBOSITY,
            })) as WorldPayload;

            console.log(`Attempt ${attempts} - parsing complete. Validating...`);

            // Log summary of the generated content
            console.log(
                `Generated: ${worldJson.locations.length} locations, ${worldJson.characters.length} characters, ${worldJson.clues.length} clues`,
            );

            // Validate the response structure
            const validationResult = validateWorldStructure(worldJson);

            // If there are validation errors, throw a custom error to continue the retry loop
            if (!validationResult.isValid) {
                throw new WorldValidationError(validationResult, worldJson);
            }

            // If we reach this point, validation passed
            console.log(`World validation successful after ${attempts} attempt${attempts > 1 ? 's' : ''}.`);

            // Convert to our internal world structure
            const world = deserializeWorldStructure(worldJson);

            console.log(
                'Final world structure contains:',
                `${world.locations.size} locations,`,
                `${world.characters.size} characters,`,
                `${world.clues.size} clues`,
            );
            console.log('Generating images...');

            const styleSeed = await generateImageStyleSeed(world);

            console.log('Using style seed:');
            console.log(styleSeed);

            // Generate images for clues and characters in parallel
            await Promise.all([
                ...world.clues.values().map(async clue => {
                    if (clue.type === 'physical') {
                        // Generate an image for the clue
                        const { buffer, mime } = await generateClueImage(world, clue, styleSeed);
                        const ext = mime.split('/')[1] ?? 'png';
                        const url = await uploadImageToStorage(
                            buffer,
                            `${world.mystery.title}/clues/${clue.id}-clue-image.${ext}`,
                        );
                        clue.image = url;
                        console.log(`Generated image for clue ${clue.name} (${clue.id})`);
                    }
                }),
                ...world.characters.values().map(async character => {
                    const { buffer, mime } = await generateCharacterImage(world, character, styleSeed);
                    const ext = mime.split('/')[1] ?? 'png';
                    const url = await uploadImageToStorage(
                        buffer,
                        `${world.mystery.title}/characters/${character.id}-character-image.${ext}`,
                    );
                    character.image = url;
                    console.log(`Generated image for character ${character.name} (${character.id})`);
                }),
            ]);

            console.log('All images generated successfully.');

            // Write the generated world to a file for inspection in development
            if (!import.meta.env.PROD) {
                writeRelative(
                    import.meta.url,
                    `../../../gens/${world.mystery.title}/world.json`,
                    JSON.stringify(worldJson, null, 4),
                );
            }

            return world;
        } catch (error) {
            if (error instanceof WorldValidationError) {
                const validationError = error;
                console.warn(`Attempt ${attempts} failed:`, validationError.message);

                if (attempts < MAX_GENERATION_ATTEMPTS && worldJson) {
                    // Add the partial result and error message to the conversation
                    previousMessages.push({
                        role: 'assistant',
                        content: JSON.stringify(worldJson),
                    });

                    // Get validation result to create comprehensive missingContent message
                    const validationResult = validateWorldStructure(worldJson);
                    const missingContent = createValidationErrorFeedback(validationResult);
                    const retryPrompt = createRetryPrompt(missingContent);

                    // Ask for improvements based on the specific issues
                    previousMessages.push({
                        role: 'user',
                        content: retryPrompt,
                    });
                } else if (attempts >= MAX_GENERATION_ATTEMPTS) {
                    console.error('Max attempts reached. Failed to generate valid world.');
                    throw new Error(
                        `Failed to generate valid world after ${MAX_GENERATION_ATTEMPTS} attempts: ${validationError.message}`,
                    );
                }
            } else {
                console.error(`Unexpected error during world generation on attempt ${attempts}:`, error);
                throw error;
            }
        }
    }

    throw new Error('Failed to generate valid world');
}

/**
 * Validates that the world structure matches the expected format and contains the required elements.
 * @param world - The world object to validate
 * @returns ValidationResult containing validation status and detailed error information
 */
export function validateWorldStructure(world: WorldPayload): ValidationResult {
    const errors: ValidationError[] = [];

    // Check if all required arrays and objects exist
    if (!world.locations || !Array.isArray(world.locations)) {
        errors.push({
            type: 'MISSING_STRUCTURE',
            message: 'Missing or invalid locations array',
            field: 'locations',
            suggestion: 'Provide a valid locations array',
        });
    }

    if (!world.characters || !Array.isArray(world.characters)) {
        errors.push({
            type: 'MISSING_STRUCTURE',
            message: 'Missing or invalid characters array',
            field: 'characters',
            suggestion: 'Provide a valid characters array',
        });
    }

    if (!world.clues || !Array.isArray(world.clues)) {
        errors.push({
            type: 'MISSING_STRUCTURE',
            message: 'Missing or invalid clues array',
            field: 'clues',
            suggestion: 'Provide a valid clues array',
        });
    }

    if (!world.mystery || typeof world.mystery !== 'object') {
        errors.push({
            type: 'MISSING_STRUCTURE',
            message: 'Missing or invalid mystery object',
            field: 'mystery',
            suggestion: 'Provide a valid mystery object',
        });
    }

    if (!world.solution || typeof world.solution !== 'object') {
        errors.push({
            type: 'MISSING_STRUCTURE',
            message: 'Missing or invalid solution object',
            field: 'solution',
            suggestion: 'Provide a valid solution object',
        });
    }

    // If basic structure is invalid, return early to avoid further errors
    if (errors.length > 0) {
        return { isValid: false, errors };
    }

    console.log('Validating world structure...');
    console.log('world.locations.length', world.locations.length);
    console.log('world.characters.length', world.characters.length);
    console.log('world.clues.length', world.clues.length);

    // Make sure there is enough data in each array
    if (world.locations.length < 5) {
        errors.push({
            type: 'INSUFFICIENT_COUNT',
            message: 'Not enough locations (minimum 5 required)',
            field: 'locations',
            expected: 5,
            actual: world.locations.length,
            suggestion: `Add ${5 - world.locations.length} more locations with connections to existing locations`,
        });
    }

    if (world.characters.length < 8) {
        errors.push({
            type: 'INSUFFICIENT_COUNT',
            message: 'Not enough characters (minimum 8 required)',
            field: 'characters',
            expected: 8,
            actual: world.characters.length,
            suggestion: `Add ${8 - world.characters.length} more characters including suspects and witnesses`,
        });
    }

    if (world.clues.length < 15) {
        errors.push({
            type: 'INSUFFICIENT_COUNT',
            message: 'Not enough clues (minimum 15 required)',
            field: 'clues',
            expected: 15,
            actual: world.clues.length,
            suggestion: `Add ${15 - world.clues.length} more clues including physical evidence and testimony`,
        });
    }

    // Validate that the culprit exists in the characters array
    const culpritExists = world.characters.some(character => character.id === world.solution.culpritId);
    if (!culpritExists) {
        errors.push({
            type: 'MISSING_CULPRIT',
            message: `Culprit with ID ${world.solution.culpritId} not found in characters array`,
            field: 'solution.culpritId',
            expected: 'Valid character ID',
            actual: world.solution.culpritId,
            suggestion: 'Ensure the culpritId matches an existing character ID',
        });
    }

    // Validate that connected locations actually exist
    for (const location of world.locations) {
        for (const connectedId of location.connectedLocations) {
            const connectedExists = world.locations.some(loc => loc.id === connectedId);
            if (!connectedExists) {
                errors.push({
                    type: 'INVALID_REFERENCE',
                    message: `Location ${location.name} references non-existent connected location ${connectedId}`,
                    field: `locations[${location.id}].connectedLocations`,
                    expected: 'Valid location ID',
                    actual: connectedId,
                    suggestion: 'Either add the missing location or update the reference to an existing location',
                });
            }
        }
    }

    // Validate that clues referenced in locations exist
    for (const location of world.locations) {
        for (const clueId of location.clues) {
            const clueExists = world.clues.some(clue => clue.id === clueId);
            if (!clueExists) {
                errors.push({
                    type: 'INVALID_REFERENCE',
                    message: `Location ${location.name} references non-existent clue ${clueId}`,
                    field: `locations[${location.id}].clues`,
                    expected: 'Valid clue ID',
                    actual: clueId,
                    suggestion: 'Either add the missing clue or update the reference to an existing clue',
                });
            }
        }
    }

    // Validate that characters referenced in locations exist
    for (const location of world.locations) {
        for (const characterId of location.characters) {
            const characterExists = world.characters.some(character => character.id === characterId);
            if (!characterExists) {
                errors.push({
                    type: 'INVALID_REFERENCE',
                    message: `Location ${location.name} references non-existent character ${characterId}`,
                    field: `locations[${location.id}].characters`,
                    expected: 'Valid character ID',
                    actual: characterId,
                    suggestion: 'Either add the missing character or update the reference to an existing character',
                });
            }
        }
    }

    // Validate that knownClues referenced by characters exist
    for (const character of world.characters) {
        if (character.knownClues) {
            for (const clueId of character.knownClues) {
                const clueExists = world.clues.some(clue => clue.id === clueId);
                if (!clueExists) {
                    errors.push({
                        type: 'INVALID_REFERENCE',
                        message: `Character ${character.name} references non-existent clue ${clueId}`,
                        field: `characters[${character.id}].knownClues`,
                        expected: 'Valid clue ID',
                        actual: clueId,
                        suggestion: 'Either add the missing clue or update the reference to an existing clue',
                    });
                }
            }
        }
    }

    // Validate that the mystery location exists
    const mysteryLocationExists = world.locations.some(location => location.id === world.mystery.location_id);
    if (!mysteryLocationExists) {
        errors.push({
            type: 'INVALID_REFERENCE',
            message: `Mystery references non-existent location ${world.mystery.location_id}`,
            field: 'mystery.location_id',
            expected: 'Valid location ID',
            actual: world.mystery.location_id,
            suggestion: 'Ensure the location_id matches an existing location ID',
        });
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Generates a character's next dialogue response based on the current game state.
 * @param character - The character to generate dialogue for
 * @param world - The world object
 * @param state - The current game state
 * @param input - The user's input to the character
 * @param options - Optional configuration for the model
 * @param options.model - The model to use for generating the dialogue
 * @returns The generated dialogue response from the character
 */
export async function getNextDialogueWithCharacter(
    character: Character,
    world: World,
    state: GameState,
    input?: string,
    options: { model?: string } = {},
): Promise<{ response: string; state: GameState }> {
    if (character.role === 'victim') {
        return { response: 'You cannot speak with the victim.', state };
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

    const location = world.locations.get(world.mystery.location_id);

    if (!location) {
        throw new Error(`Crime location with ID ${world.mystery.location_id} not found in world locations.`);
    }

    // Create prompt based on character role and context
    let prompt = `\
You are an AI roleplaying/method acting as a fictional character in a mystery-themed text adventure game. Stay fully in character—speak, think, and act like this character would. Do not refer to yourself as an AI or break the fourth wall.
Your role is to engage with the user, who is the detective, as your character: share suspicions, express doubts, notice details, and react naturally to clues or odd behavior.
It is the detective's job to ask questions and gather information in the hope of solving the mystery.

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

You do not control the world, environment, or events. That is handled by the game master. Focus only on what your character says or feels.

You are ${character.name}. ${character.description}.
Your character's personality is ${character.personality}.
The mystery is: ${world.mystery.title}: ${world.mystery.description}.
You are a ${character.role} in this mystery.
The victim is: ${world.mystery.victim}
The crime is: ${world.mystery.crime}
The time of the crime is: ${world.mystery.time}
The location of the crime is: ${location.name}, ${location.description}.
The user is currently in a conversation with you.

This is the current mystery world:
<WORLD>
${JSON.stringify(world, null, 4)}
</WORLD>
The user has the following memories:
<MEMORY>
${JSON.stringify(state.memories, null, 4)}
</MEMORY>

This is the current game state:
<GAME_STATE>
${JSON.stringify(state, null, 4)}
</GAME_STATE>

The user knows the following clues:
<USER_KNOWN_CLUES>
${JSON.stringify(
    state.cluesFound.map(id => world.clues.get(id)),
    null,
    4,
)}
</USER_KNOWN_CLUES>

Your alibi is: ${character.alibi ?? 'No alibi provided'}. 
You know about these clues: ${knownCluesDescription ?? 'No specific clues'}. 
The user has found these clues: ${cluesFoundByPlayer ?? 'No clues yet'}.\n`;

    // Customize prompt based on character role and user progress
    if (character.role === 'suspect') {
        prompt += `\
You should be evasive if the user mentions clues that might incriminate you,
but remain in character and provide helpful information about what you know.
If you have nothing to say, you can say you have nothing to add.
If there is no existing conversation start by intoducing yourself to the user.`;
    } else {
        // For witnesses
        prompt += `\
You should be helpful and provide information about what you know.
If you have nothing to say, you can say you have nothing to add.
If there is no existing conversation start by intoducing yourself to the user.`;
    }

    const messages: Message[] = [
        {
            role: 'system',
            content: prompt,
        },
        ...dialogueHistory,
    ];

    if (input) {
        messages.push({
            role: 'user',
            content: input,
        });
    }

    // const tools: Array<Tool> = [
    //     {
    //         type: 'function',
    //         name: 'reveal_clue',
    //         description: 'Reveal a clue to the user',
    //         parameters: {
    //             type: 'object',
    //             properties: {
    //                 clueId: {
    //                     type: 'string',
    //                     description: 'The ID of the clue to reveal'
    //                 }
    //             },
    //             required: ['clueId']
    //         },
    //         when: 'If you menation a clue that the user has not found yet, you can use this function to reveal it to them.',
    //         handler: async (params: { clueId: ClueID }) => revealClue(world, state, params.clueId)
    //     }
    // ];

    const newDialogue = await OpenRouter.generateCompletion(options.model ?? DEFAULT_WEAK_MODEL, messages);

    if (input) {
        // Add the user input to the character's history
        dialogueHistory.push({
            role: 'user',
            content: input,
        });
    }

    // Add the new dialogue to the character's history
    dialogueHistory.push({
        role: 'assistant',
        content: newDialogue,
    });

    const newState = await updateGameState(world, state);

    // Return the new dialogue
    return { response: newDialogue, state: newState };
}

/**
 * Updates the game state with new memories, facts, and revealed clues based on the current game state.
 * @param world - The world object
 * @param state - The current game state
 */
export async function updateGameState(world: World, state: GameState): Promise<GameState> {
    await Promise.all([updateKnownClues(world, state), updateMemories(world, state)]);

    return state;
}

export async function updateMemories(world: World, state: GameState): Promise<GameState> {
    // Here we will run the game master on the current game state
    // and check if there are any changes to the game state
    // We will look for stuff like new memories or facts that have been created

    // Are we in a conversation?
    if (state.isInConversation) {
        // Check if the current character is still in the same location
        if (state.currentCharacter) {
            const character = world.characters.get(state.currentCharacter);

            if (character) {
                const conversation = state.dialogueHistory[character.id];

                if (conversation) {
                    // Extract new memories or facts from the conversation
                    // TODO: update when location exploration is working
                    const SYSTEM_PROMPT = `\
You are Mystwright, a game master for a mystery text adventure.
Your job is to keep track of facts and memories that the user has learned during the game. Or that characters have created.
This is to maintain consistency in the game world.
Each memory or fact should be a simple statement that can be added to the game state.
The memory origin_id should be the ID of a valid character in the game world.

This is the current mystery world:
<WORLD>
${JSON.stringify(world, null, 4)}
</WORLD>
The user is currently in a conversation with ${character.name}.
The user has the following memories:
<MEMORY>
${JSON.stringify(state.memories, null, 4)}
</MEMORY>
The user knows the following clues:
<USER_KNOWN_CLUES>
${JSON.stringify(
    state.cluesFound.map(id => world.clues.get(id)),
    null,
    4,
)}
</USER_KNOWN_CLUES>
The user is currently in a conversation with ${character.name} and has the following dialogue history:
<CONVERSATION>
${JSON.stringify(conversation, null, 4)}
</CONVERSATION>
The user has the following game state:
<GAME_STATE>
${JSON.stringify(state, null, 4)}
</GAME_STATE>`;

                    const memory_schema = {
                        name: 'memory-update',
                        strict: true,
                        schema: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    origin_id: { type: 'string' },
                                    origin_type: { type: 'string', enum: ['character'] },
                                    content: { type: 'string' },
                                },
                                required: ['origin_id', 'origin_type', 'content'],
                                additionalProperties: false,
                            },
                        },
                    };

                    const memories = (await OpenRouter.generateCompletion(
                        DEFAULT_WEAK_MODEL,
                        [
                            {
                                role: 'system',
                                content: SYSTEM_PROMPT,
                            },
                            {
                                role: 'user',
                                content: `Provide a list of new memories or facts that the user has learned during the game. Or that characters have created.`,
                            },
                        ],
                        { schema: memory_schema },
                    )) as Array<Memory>;

                    // Check if there are any new memories
                    if (memories !== null && memories !== undefined && Array.isArray(memories)) {
                        for (const memory of memories) {
                            // Add the new memory to the game state
                            state.memories.push(memory);
                        }
                    }
                }
            }
        }
    }

    return state;
}

export async function updateKnownClues(world: World, state: GameState): Promise<GameState> {
    // Are we in a conversation?
    if (state.isInConversation) {
        // Check if the current character is still in the same location
        if (state.currentCharacter) {
            const character = world.characters.get(state.currentCharacter);

            if (character) {
                const conversation = state.dialogueHistory[character.id];

                if (conversation) {
                    // Extract new memories or facts from the conversation
                    // TODO: update when location exploration is working
                    const SYSTEM_PROMPT = `\
You are Mystwright, a game master for a mystery text adventure.
Your job is to keep track of clues that the user has learned during the game. Or that characters have revealed.
This is to maintain consistency in the game world.
If the current character has revealed a clue to the user in the conversation return the clue ID in your response.

The user is currently in a conversation with ${character.name} and has the following dialogue history:
<CONVERSATION>
${JSON.stringify(conversation, null, 4)}
</CONVERSATION>
This character knows the following clues:
${
    character.knownClues &&
    `\
<CHARACTER_KNOWN_CLUES>
${JSON.stringify(
    character.knownClues.map(id => world.clues.get(id)),
    null,
    4,
)}
</CHARACTER_KNOWN_CLUES>`
}
The user knows the following clues:
<USER_KNOWN_CLUES>
${JSON.stringify(
    state.cluesFound.map(id => world.clues.get(id)),
    null,
    4,
)}
</USER_KNOWN_CLUES>
This is the current mystery world:
<WORLD>
${JSON.stringify(world, null, 4)}
</WORLD>`;

                    const clues_schema = {
                        name: 'clues-update',
                        strict: true,
                        schema: {
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                            additionalProperties: false,
                        },
                    };

                    const clues = (await OpenRouter.generateCompletion(
                        DEFAULT_WEAK_MODEL,
                        [
                            {
                                role: 'system',
                                content: SYSTEM_PROMPT,
                            },
                            {
                                role: 'user',
                                content: `Provide a list of new clues that the user has learned during the game. Or that characters have revealed.`,
                            },
                        ],
                        { schema: clues_schema },
                    )) as Array<ClueID>;

                    // Check if there are any new clues
                    if (clues !== null && clues !== undefined && Array.isArray(clues)) {
                        for (const clue of clues) {
                            revealClue(world, state, clue);
                        }
                    }
                }
            }
        }
    }

    return state;
}

/**
 * Reveals a clue to the user in the game state.
 * @param world - The world object
 * @param state - The current game state
 * @param clueId - The ID of the clue to reveal
 * @throws Will throw an error if the clue is not found in the world
 */
export function revealClue(world: World, state: GameState, clueId: ClueID): void {
    const clue = world.clues.get(clueId);

    if (!clue) {
        return;
        throw new Error(`Clue with ID ${clueId} not found`);
    }

    if (!state.cluesFound.includes(clueId)) {
        state.cluesFound.push(clueId);
    }
}

export async function attemptSolve(
    world: World,
    state: GameState,
    input: string,
): Promise<{ solved: boolean; response: string; state: GameState }> {
    const SYSTEM_PROMPT = `\
You are Mystwright, a game master for a mystery text adventure.
The user is making a guess for the solution to the mystery.

This is the current mystery world (this contains privleged information that the user does not have access to):
<WORLD>
${JSON.stringify(world, null, 4)}
</WORLD>
Currently you are to roleplay as the Judge in a courtroom.
Provide a response to the user based on their guess.

Reject a guess if it is not based on evidence or if it is not a valid guess. Request more evidence or information if needed.
Reject a guess if it has insufficient evidence to support it. Request more evidence or information if needed.`;

    // NOTE: adding this to the pompt causes the model to actually allow guesses with no evidence

    // If the guess is correct, respond with a positive confirmation and a brief explanation of how the user solved the mystery and the solved boolean should be set to true.
    // If the guess is incorrect, respond with a negative confirmation and a brief explanation of why the guess is incorrect.
    // If the guess is correct but with insufficient evidence, respond with a neutral confirmation and a brief explanation of what is missing. The mystery is not considered solved in this case.

    // There are some rules to follow:

    // - The response should be in the first person, as if you are the Judge.
    // - The response should be clear and concise, without unnecessary details.
    // - The response should be in the tone of a courtroom judge, maintaining a formal and authoritative demeanor.
    // - The users supplied guess MUST have enough evidence to support it, or it should be considered incorrect.
    // - DO NOT allow the user to ask for hints or clues. They must provide a guess based on the evidence they have gathered.
    // - DO NOT provide any additional information or context outside of the response to the user's guess.
    // - DO NOT allow a guess made with no evidence and just names to be considered a solved.

    const messages: Message[] = [
        {
            role: 'system',
            content: SYSTEM_PROMPT,
        },
    ];

    let history = state.dialogueHistory[JUDGE_CHARACTER_ID];

    if (history === null || history === undefined) {
        history = state.dialogueHistory[JUDGE_CHARACTER_ID] = [];
    }

    history.push({
        role: 'user',
        content: input,
    });

    messages.push(...history);

    const response = await OpenRouter.generateCompletion<any, { solved: boolean; response: string }>(
        DEFAULT_WEAK_MODEL,
        messages,
        {
            schema: {
                name: 'attempt-solve-response',
                strict: true,
                schema: {
                    type: 'object',
                    properties: {
                        solved: { type: 'boolean' },
                        response: { type: 'string' },
                    },
                    required: ['solved', 'response'],
                    additionalProperties: false,
                },
            },
        },
    );

    history.push({
        role: 'assistant',
        content: response.response,
    });

    messages.push({
        role: 'assistant',
        content: response.response,
    });

    state.solved = response.solved;

    return {
        solved: response.solved,
        response: response.response,
        state,
    };
}

// GOOD IMAGE SEED GENS SO FAR:
const PULP_FICTION_SEED = `\
For this image, imagine a world rendered in the style of classic pulp magazine covers, specifically inspired by the Golden Age of detective fiction. \
Think dramatic lighting, bold colors, and slightly exaggerated features reminiscent of artists like Norman Saunders and Margaret Brundage. \
There's a touch of film noir influence seeping in, with high contrast and a focus on shadow to heighten the suspense and intrigue.`;

const VICTORIAN_MYSTERY_SEED = `\
For this image, envision a photorealistic painting in the style of early 20th-century Impressionism, touched with the melancholic atmosphere of a foggy London evening. \
Capture the scene with delicate brushstrokes and a muted color palette, focusing on the ethereal quality of light filtering through the mist-laden air. \
There should be a hint of something sinister lurking beneath the surface, suggested by subtle distortions and unsettling shadows.`;

const GREAT_GATSPY_SEED = `\
For this image, picture a heavily stylized scene reminiscent of Art Deco posters from the 1930s, with sharp lines, geometric shapes, and a limited but vibrant color palette. \
The characters are elegant and elongated, almost caricatured, with an emphasis on fashion and dramatic posing. \
There's a sense of opulence and mystery, with hidden details and symbolic motifs woven into the design.`;

const WHIMSICAL_DARK_VICTORIAN_SEED = `\
For this image, envision a world rendered in a darkly whimsical style reminiscent of Edward Gorey's illustrations, imbued with the subtle, unsettling atmosphere of a Victorian-era daguerreotype. \
Imagine finely detailed cross-hatching, muted tones, and an emphasis on the macabre, all while maintaining a sense of understated elegance. \
A faint touch of surrealism should hint at something strange lurking just beyond the surface of polite society.`;

const SIN_CITY_SEED = `\
For this image, visualize a grim and gritty scene rendered in the style of hard-boiled comic noir, similar to Frank Miller's \"Sin City\" but with a touch of Edward Hopper's stark realism. \
Think angular shadows, stark black and white contrasts punctuated by selective bursts of vibrant color (perhaps a single red object), and a focus on the urban decay and moral ambiguity of the setting. \
The emotions conveyed by the image are tension, despair, and a simmering undercurrent of violence.`;

/**
 * Generates a prompt seed describing the artistic style for generating images in the mystery world.
 * @param world - The world object
 * @returns A prompt seed describing the artistic style for generating images in the mystery world
 */
export async function generateImageStyleSeed(world: World): Promise<string> {
    const SYSTEM_PROMPT = `\
You are Mystwright, a game master for a mystery text adventure.
You are to provide a few scentences that describe the artistic style of images that will be created for the mystery world.
This will be used as a seed for generating images for the mystery. It should start with "For this image..."

<EXAMPLES>
${PULP_FICTION_SEED}

${VICTORIAN_MYSTERY_SEED}

${GREAT_GATSPY_SEED}

${WHIMSICAL_DARK_VICTORIAN_SEED}

${SIN_CITY_SEED}
</EXAMPLES>
`;

    const messages: Message[] = [
        {
            role: 'system',
            content: SYSTEM_PROMPT,
        },
    ];

    const response = await OpenRouter.generateCompletion(DEFAULT_WEAK_MODEL, messages, {
        temperature: GENERATION_TEMPERATURE,
        verbosity: VERBOSITY,
    });

    return response;
}

// Similar to generateImageStyleSeed but wasn't constrained to artistic styles
// Could still be useful for something else like getting the era, mood, or setting of the mystery
// This could inform dialogue generation as well or something like that
export async function generateWorldStyleSeed(world: World): Promise<string> {
    const SYSTEM_PROMPT = `\
You are Mystwright, a game master for a mystery text adventure.
You are to provide a few scentences that describe the style of images that would fit the mystery world.
This will be used as a seed for generating images for the mystery.
The description should be concise but evocative. It should give a hint to the era and visual style of the world.

<EXAMPLES>
If the mystery is a noir detective story, the description might include terms like "dark", "shadowy", "high contrast", "rain-soaked streets", "vintage 1940s aesthetic".
If the mystery is a cozy village mystery, the description might include terms like "warm", "inviting", "quaint village", "countryside", "autumn colors".
If the mystery is a modern thriller, the description might include terms like "sleek", "urban", "nighttime cityscape", "neon lights", "contemporary fashion".
If the mystery is a historical whodunit, the description might include terms like "period costumes", "cobblestone streets", "gas lamps", "Victorian architecture".
</EXAMPLES>
`;

    const messages: Message[] = [
        {
            role: 'system',
            content: SYSTEM_PROMPT,
        },
        {
            role: 'user',
            content: `The mystery is: ${world.mystery.title}: ${world.mystery.description}.`,
        },
    ];

    const response = await OpenRouter.generateCompletion(DEFAULT_WEAK_MODEL, messages);

    return response;
}

export async function generateClueImage(
    world: World,
    clue: Clue,
    styleSeed: string = '',
): Promise<{ buffer: Buffer; mime: string }> {
    const prompt = `\
An image that looks like a photograph of evidence taken at a crime scene for the clue: ${clue.name}. \
${clue.description} \
NO WHITE BORDER. FILL THE IMAGE CORNER TO CORNER \
The image should be a realistic representation of the clue, with no additional elements or distractions. \
The image should be clear and focused on the clue itself.\
${styleSeed}`;

    const result = await generateImageFromPrompt('google/imagen-4-ultra', prompt);

    return { buffer: result.buffer, mime: result.mime };
}

// export async function generateWorldImage(world: World): Promise<Buffer> {}

export async function generateCharacterImage(
    world: World,
    character: Character,
    styleSeed: string = '',
): Promise<{ buffer: Buffer; mime: string }> {
    const prompt = `\
JUST A CHARACTER PORTRAIT of ${character.name}. ${character.description}. \
${character.name}'s personality is ${character.personality}. \
The image should be a realistic representation of the character, with no additional elements, borders, or distractions. \
${styleSeed}`;

    const result = await generateImageFromPrompt('google/imagen-4-ultra', prompt);

    return { buffer: result.buffer, mime: result.mime };
}

export const MYSTWRIGHT_MEDIA_BUCKET = 'rough-resonance-124';

export async function uploadImageToStorage(image: Buffer, filename: string): Promise<string> {
    const bucket = new Bun.S3Client({
        region: 'auto',
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        endpoint: process.env.S3_ENDPOINT,
        bucket: process.env.S3_BUCKET_NAME,
    });

    const filePath = `${crypto.randomUUID()}/${filename}`;
    const file = bucket.file(filePath);
    await file.write(image, { acl: 'public-read' });
    if (file.bucket === MYSTWRIGHT_MEDIA_BUCKET) {
        return `https://media.mystwright.com/${filePath}`;
    } else {
        return `https://${file.bucket}.fly.storage.tigris.dev/${filePath}`;
    }
}
