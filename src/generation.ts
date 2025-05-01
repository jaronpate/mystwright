import { ElevenLabsClient } from "elevenlabs";
import { OpenRouter } from "./openrouter";
import type { APIWorldResponse, Character, CharacterID, Clue, ClueID, GameState, Location, LocationID, Message, World } from "./types";
import { writeRelative } from "./util";

const elevenlabs = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

/**
 * Generates a mystery and world by sending a request to OpenRouter's API
 * using structured JSON output format. If validation fails, it will
 * request more content from the model until we have a valid world.
 * @param config - Optional configuration object with API key and model
 */
export async function generateWorld(config: { model?: string; } = {}): Promise<World> {
    const { voices } = await elevenlabs.voices.getAll();

    let availableVoices = `Available voices:\n\n`;

    for (const voice of voices) {
        if (voice.labels && voice.high_quality_base_model_ids?.includes('eleven_multilingual_v2')) {
            availableVoices += `Name: ${voice.name}\nLabels: ${voice.labels.gender}, ${voice.labels.accent}, ${voice.labels.description}, ${voice.labels.age}\n\n`;
        }
    }

    const SYSTEM_PROMPT = `\
You are Mystwright, a game master for a mystery text adventure.

You generate vivid descriptions and guide the user through a mystery, revealing clues gradually and never giving away the solution outright

Your purpose is to create structured, solvable mystery scenarios. Keep them clever and ensure the user can deduce the solution from the clues provided.
Don't make it too easy though. There should be some locations and clues that are red herrings or not directly related to the solution. The user should have to think critically and piece together the clues to arrive at the correct conclusion.
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
- For each character select an appropriate voice based on the info provided about the voice and the personality and description given to the character. Provice the 'Name' for the selected voice in the JSON output.

${availableVoices}

Tone and inspiration: grounded, deductive, and in the spirit of classic detective fiction like Sherlock Holmes and Agatha Christie.
    `;

    const WORLD_GENERATION_PROMPT = `\
Create a mystery with a modern mystery novel tone
    `;
    // const model = config.model ?? 'openai/o4-mini-high';
    const maxAttempts = 3; // Maximum number of attempts to generate a valid world
    let attempts = 0;
    let worldJson: APIWorldResponse | null = null;
    let previousMessages: Array<Message> = [
        {
            role: 'system',
            content: SYSTEM_PROMPT
        },
        {
            role: 'user',
            content: WORLD_GENERATION_PROMPT
        }
    ];
    let validationError: Error | null = null;

    const schema = {
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
                                items: { type: 'string' }
                            },
                            clues: { 
                                type: 'array', 
                                items: { type: 'string' }
                            },
                            characters: { 
                                type: 'array', 
                                items: { type: 'string' }
                            }
                        },
                        required: ['id', 'name', 'description', 'connectedLocations', 'clues', 'characters'],
                        additionalProperties: false
                    }
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
                                enum: ['suspect', 'witness', 'victim']
                            },
                            alibi: { type: ['string', 'null'] },
                            knownClues: {
                                type: 'array',
                                items: { type: 'string' }
                            }
                        },
                        required: ['id', 'name', 'description', 'personality', 'voice', 'role', 'alibi', 'knownClues'],
                        additionalProperties: false
                    }
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
                                enum: ['physical', 'testimony', 'other']
                            }
                        },
                        required: ['id', 'name', 'description', 'type'],
                        additionalProperties: false
                    }
                },
                mystery: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                        description: { type: 'string' },
                        victim: { type: 'string' },
                        crime: { type: 'string' }
                    },
                    required: ['title', 'description', 'victim', 'crime'],
                    additionalProperties: false
                },
                solution: {
                    type: 'object',
                    properties: {
                        culpritId: { type: 'string' },
                        motive: { type: 'string' },
                        method: { type: 'string' }
                    },
                    required: ['culpritId', 'motive', 'method'],
                    additionalProperties: false
                }
            },
            required: ['locations', 'characters', 'clues', 'mystery', 'solution'],
            additionalProperties: false
        }
    };

    while (attempts < maxAttempts) {
        attempts++;
        console.log(`Attempt ${attempts} of ${maxAttempts} to generate valid world`);
        
        try {
            // Parse the JSON content from the response
            worldJson = await OpenRouter.generateCompletion(
                config.model ?? 'google/gemini-2.0-flash-001',
                previousMessages,
                schema
            ) as APIWorldResponse;

            console.log(`Attempt ${attempts} - parsing complete. Validating...`);
            
            // Log summary of the generated content
            console.log(`Generated: ${worldJson.locations.length} locations, ${worldJson.characters.length} characters, ${worldJson.clues.length} clues`);

            // Validate the response structure
            validateWorldStructure(worldJson);
            
            // If we reach this point, validation passed
            console.log("World validation successful after", attempts, "attempts");
            
            // Convert to our internal world structure
            const world = constructWorldStructure(worldJson);
            console.log(
                'Final world structure contains:', 
                `${world.locations.size} locations,`,
                `${world.characters.size} characters,`,
                `${world.clues.size} clues`
            );
            
            // Write the generated world to a file
            // Intentionally not waiting for the write to finish to prevent longer load times
            writeRelative(`../gens${world.mystery.title}.json`, JSON.stringify(worldJson, null, 4));

            return world;
        } catch (error) {
            validationError = error as Error;
            console.warn(`Attempt ${attempts} failed:`, validationError.message);
            
            if (attempts < maxAttempts && worldJson) {
                // Add the partial result and error message to the conversation
                previousMessages.push({
                    role: 'assistant', 
                    content: JSON.stringify(worldJson)
                });
                
                // Analyze validation error to provide specific guidance
                let missingContent = '';
                
                // Check for specific error types and provide targeted guidance
                if (validationError.message.includes('Not enough locations')) {
                    missingContent += `- ADD ${5 - worldJson.locations.length} more locations (currently have ${worldJson.locations.length}, need at least 5)\n`;
                    missingContent += '  For each new location, include connections to existing locations\n';
                }
                
                if (validationError.message.includes('Not enough characters')) {
                    missingContent += `- ADD ${8 - worldJson.characters.length} more characters (currently have ${worldJson.characters.length}, need at least 8)\n`;
                    missingContent += '  Include a mix of suspects and witnesses with detailed descriptions and alibis\n';
                }
                
                if (validationError.message.includes('Not enough clues')) {
                    missingContent += `- ADD ${15 - worldJson.clues.length} more clues (currently have ${worldJson.clues.length}, need at least 15)\n`;
                    missingContent += '  Include both physical evidence and testimony clues\n';
                }
                
                // Check for reference errors
                if (validationError.message.includes('references non-existent')) {
                    missingContent += '- FIX invalid references: ' + validationError.message + '\n';
                    missingContent += '  Either add the missing referenced items or update the references to existing items\n';
                }
                
                // Culprit exists check
                if (validationError.message.includes('Culprit with ID')) {
                    missingContent += '- FIX culprit reference: ensure the culpritId in solution matches an existing character ID\n';
                }
                
                // Add a generic message if no specific issues were identified
                if (!missingContent) {
                    missingContent = `- FIX the following issue: ${validationError.message}\n`;
                }
                
                // Ask for improvements based on the specific issues
                previousMessages.push({
                    role: 'user',
                    content: `\
Your mystery world is good but needs some additions. Please ADD TO the existing world (don't replace it):

${missingContent}
Important instructions:
1. Keep ALL existing content (characters, locations, clues, mystery details)
2. Maintain consistency with the existing story, title, and theme
3. Make sure new elements connect logically with existing ones
4. Make sure all IDs are unique and all references are valid
5. Return the COMPLETE JSON with both existing and new content combined

Your response should be a single, complete JSON object containing the original content plus the new additions.`
                });
            } else if (attempts >= maxAttempts) {
                console.error("Max attempts reached. Failed to generate valid world.");
                throw new Error(`Failed to generate valid world after ${maxAttempts} attempts: ${validationError.message}`);
            }
        }
    }

    throw new Error("Failed to generate valid world");
}

/**
 * Validates that the world structure matches the expected format and contains the required elements.
 * @param world - The world object to validate
 * @throws Will throw an error if the world structure is invalid or incomplete.
 * @throws Will throw an error if the world structure is missing required elements.
 * @throws Will throw an error if the world structure contains invalid references.
 */
export function validateWorldStructure(world: APIWorldResponse): void {
    // Check if all required arrays and objects exist
    if (!world.locations || !Array.isArray(world.locations)) {
        throw new Error('Missing or invalid locations array');
    }
    
    if (!world.characters || !Array.isArray(world.characters)) {
        throw new Error('Missing or invalid characters array');
    }
    
    if (!world.clues || !Array.isArray(world.clues)) {
        throw new Error('Missing or invalid clues array');
    }
    
    if (!world.mystery || typeof world.mystery !== 'object') {
        throw new Error('Missing or invalid mystery object');
    }
    
    if (!world.solution || typeof world.solution !== 'object') {
        throw new Error('Missing or invalid solution object');
    }

    console.log('Validating world structure...');
    console.log('world.locations.length', world.locations.length);
    console.log('world.characters.length', world.characters.length);
    console.log('world.clues.length', world.clues.length);

    // Make sure there is enough data in each array
    if (world.locations.length < 5) {
        throw new Error('Not enough locations (minimum 5 required)');
    }
    
    if (world.characters.length < 8) {
        throw new Error('Not enough characters (minimum 8 required)');
    }

    if (world.clues.length < 15) {
        throw new Error('Not enough clues (minimum 15 required)');
    }
    
    // Validate that the culprit exists in the characters array
    const culpritExists = world.characters.some(character => character.id === world.solution.culpritId);
    if (!culpritExists) {
        throw new Error(`Culprit with ID ${world.solution.culpritId} not found in characters array`);
    }
    
    // Validate that connected locations actually exist
    for (const location of world.locations) {
        for (const connectedId of location.connectedLocations) {
            const connectedExists = world.locations.some(loc => loc.id === connectedId);
            if (!connectedExists) {
                throw new Error(`Location ${location.name} references non-existent connected location ${connectedId}`);
            }
        }
    }
    
    // Validate that clues referenced in locations exist
    for (const location of world.locations) {
        for (const clueId of location.clues) {
            const clueExists = world.clues.some(clue => clue.id === clueId);
            if (!clueExists) {
                throw new Error(`Location ${location.name} references non-existent clue ${clueId}`);
            }
        }
    }
    
    // Validate that characters referenced in locations exist
    for (const location of world.locations) {
        for (const characterId of location.characters) {
            const characterExists = world.characters.some(character => character.id === characterId);
            if (!characterExists) {
                throw new Error(`Location ${location.name} references non-existent character ${characterId}`);
            }
        }
    }
    
    // Validate that knownClues referenced by characters exist
    for (const character of world.characters) {
        if (character.knownClues) {
            for (const clueId of character.knownClues) {
                const clueExists = world.clues.some(clue => clue.id === clueId);
                if (!clueExists) {
                    throw new Error(`Character ${character.name} references non-existent clue ${clueId}`);
                }
            }
        }
    }
}

/**
 * Constructs the world structure from the raw API response.
 * @param raw - The raw API response object
 * @returns The constructed world object
 */
export function constructWorldStructure(raw: APIWorldResponse): World {
    // Convert string IDs to branded types
    const locations = new Map<LocationID, Location>();

    for (const raw_location of raw.locations) {
        const location = {
            id: raw_location.id as LocationID,
            name: raw_location.name,
            description: raw_location.description,
            connectedLocations: raw_location.connectedLocations,
            clues: raw_location.clues,
            characters: raw_location.characters
        };

        locations.set(location.id, location);
    }

    const characters = new Map<CharacterID, Character>();

    for (const raw_character of raw.characters) {
        const character = {
            id: raw_character.id as CharacterID,
            name: raw_character.name,
            description: raw_character.description,
            personality: raw_character.personality,
            voice: raw_character.voice,
            role: raw_character.role,
            alibi: raw_character.alibi,
            knownClues: (raw_character.knownClues ?? []) as ClueID[]
        };

        characters.set(character.id, character);
    }
    
    const clues = new Map<ClueID, Clue>();

    for (const raw_clue of raw.clues) {
        const clue = {
            id: raw_clue.id as ClueID,
            name: raw_clue.name,
            description: raw_clue.description,
            type: raw_clue.type
        };

        clues.set(clue.id, clue);
    }
    
    // Construct the world object
    return {
        locations,
        characters,
        clues,
        mystery: {
            title: raw.mystery.title,
            description: raw.mystery.description,
            victim: raw.mystery.victim,
            crime: raw.mystery.crime
        },
        solution: {
            culpritId: raw.solution.culpritId as CharacterID,
            motive: raw.solution.motive,
            method: raw.solution.method
        }
    };
}

/**
 * Constructs the initial game state for the mystery game.
 * @param world - The world object to construct the game state from
 * @returns The initial game state object
 */
export function constructGameState(world: World): GameState {
    // Setup initial game state
    return {
        currentLocation: null,
        currentCharacter: null,
        cluesFound: [],
        solved: false,
        isInConversation: false,
        memories: [],
        dialogueHistory: {}
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
export async function getNextDialogueWithCharacter(character: Character, world: World, state: GameState, input?: string, options: { model?: string; } = {}): Promise<string> {
    if (character.role === 'victim') {
        return "You cannot speak with the victim.";
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
Your role is to engage with the user, who is the investigator, as your character: share suspicions, ask questions, express doubts, notice details, and react naturally to clues or odd behavior.

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

Be proactive—if the user stalls or seems uncertain, prompt them with ideas, pose questions, or draw attention to inconsistencies. Your goal is to help unravel the mystery through character-driven interaction.
You do not control the world, environment, or events. That is handled by the game master. Focus only on what your character says or feels.

You are ${character.name}. ${character.description}.
Your character's personality is ${character.personality}.
The mystery is: ${world.mystery.title}: ${world.mystery.description}.
You are a ${character.role} in this mystery.
The victim is: ${world.mystery.victim}
The crime is: ${world.mystery.crime}

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
${JSON.stringify(state.cluesFound.map(id => world.clues.get(id)), null, 4)}
</USER_KNOWN_CLUES>
The user has the following game state:
<GAME_STATE>
${JSON.stringify(state, null, 4)}
</GAME_STATE>

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

    const newDialogue = await OpenRouter.generateCompletion(options.model ?? 'google/gemini-2.0-flash-001', messages);

    if (input) {
        // Add the user input to the character's history
        dialogueHistory.push({
            role: 'user',
            content: input
        });
    }

    // Add the new dialogue to the character's history
    dialogueHistory.push({
        role: 'assistant',
        content: newDialogue
    });

    updateGameStateMemories(world, state);

    // Return the new dialogue
    return newDialogue;
}

/**
 * Updates the game state with new memories or facts based on the current game state.
 * @param world - The world object
 * @param state - The current game state
 */
export async function updateGameStateMemories(world: World, state: GameState): Promise<void> {
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
${JSON.stringify(state.cluesFound.map(id => world.clues.get(id)), null, 4)}
</USER_KNOWN_CLUES>
The user is currently in a conversation with ${character.name} and has the following dialogue history:
<CONVERSATION>
${JSON.stringify(conversation, null, 4)}
</CONVERSATION>
The user has the following game state:
<GAME_STATE>
${JSON.stringify(state, null, 4)}
</GAME_STATE>\
                    `;

                    const schema = {
                        name: 'memories',
                        strict: true,
                        schema: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    origin_id: { type: 'string' },
                                    origin_type: { type: 'string', enum: ['character'] },
                                    content: { type: 'string' }
                                },
                                required: ['origin_id', 'origin_type', 'content'],
                                additionalProperties: false
                            }
                        }
                    };

                    const memories = await OpenRouter.generateCompletion(
                        'google/gemini-2.0-flash-001',
                        [
                            {
                                role: 'system',
                                content: SYSTEM_PROMPT
                            },
                            {
                                role: 'user',
                                content: `Please provide a list of new memories or facts that the user has learned during the game. Or that characters have created.`
                            }
                        ],
                        schema
                    );

                    // Check if there are any new memories
                    if (memories && Array.isArray(memories)) {
                        for (const memory of memories) {
                            // Add the new memory to the game state
                            state.memories.push(memory);
                        }
                    }
                }
            }
        }
    }
}