import type { World, Location, Character, Clue, Solutuion, Mystery, CharacterID, LocationID, ClueID } from './types';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const SYSTEM_PROMPT = `\
You are Mystwright, a game master for a mystery text adventure.

You generate vivid descriptions and guide the player through a mystery, revealing clues gradually and never giving away the solution outright

Your purpose is to create structured, solvable mystery scenarios. Keep them clever and ensure the player can deduce the solution from the clues provided.
Don't make it too easy though. There should be some locations and clues that are red herrings or not directly related to the solution. The player should have to think critically and piece together the clues to arrive at the correct conclusion.
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

Tone and inspiration: grounded, deductive, and in the spirit of classic detective fiction like Sherlock Holmes and Agatha Christie.
`;

const WORLD_GENERATION_PROMPT = `\
Create a mystery with a modern mystery novel tone
`;

// Type representing the data structure from OpenRouter (different from our Map-based World type)
type APIWorldResponse = {
    locations: {
        id: string;
        name: string;
        description: string;
        connectedLocations: string[];
        clues: string[];
        characters: string[];
    }[];
    characters: {
        id: string;
        name: string;
        description: string;
        personality: string;
        role: 'suspect' | 'witness' | 'victim';
        alibi?: string;
        knownClues?: string[];
    }[];
    clues: {
        id: string;
        name: string;
        description: string;
        type: 'physical' | 'testimony' | 'other';
    }[];
    mystery: {
        title: string;
        description: string;
        victim: string;
        crime: string;
    };
    solution: {
        culpritId: string;
        motive: string;
        method: string;
    };
};

type OpenRouterResponse = {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    error?: {
        message: string;
        type: string;
        param?: string;
        code?: string;
    };
};

interface GenerateWorldConfig {
    apiKey?: string;
    model?: string;
}

/**
 * Generates a fantasy world by sending a request to OpenRouter's API
 * using structured JSON output format. If validation fails, it will
 * request more content from the model until we have a valid world.
 */
async function generateWorld(config: GenerateWorldConfig = {}): Promise<World> {
    const apiKey = config.apiKey ?? OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error('OpenRouter API key is required');
    }

    // const model = config.model ?? 'openai/o4-mini-high';
    const model = config.model ?? 'google/gemini-2.0-flash-001';
    const maxAttempts = 3; // Maximum number of attempts to generate a valid world
    let attempts = 0;
    let worldJson: APIWorldResponse | null = null;
    let previousMessages: Array<{role: string, content: string}> = [
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
                        required: ['id', 'name', 'description', 'personality', 'role', 'alibi', 'knownClues'],
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
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model,
                    messages: previousMessages,
                    response_format: {
                        type: 'json_schema',
                        json_schema: schema
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`OpenRouter API error: ${response.status} ${JSON.stringify(errorData)}`);
            }

            const data = await response.json() as OpenRouterResponse;

            if (data.error) {
                console.error('OpenRouter API error:', data.error);
                throw new Error(`OpenRouter API error: ${data.error.message}`);
            }

            console.log(`Attempt ${attempts} API response received`);
            
            if (!data.choices || !data.choices[0]?.message?.content) {
                throw new Error('Invalid response format from OpenRouter API');
            }

            // Parse the JSON content from the response
            worldJson = JSON.parse(data.choices[0].message.content) as APIWorldResponse;
            console.log(`Attempt ${attempts} - parsing complete. Validating...`);
            
            // Log summary of the generated content
            console.log(`Generated: ${worldJson.locations.length} locations, ${worldJson.characters.length} characters, ${worldJson.clues.length} clues`);

            // Validate the response structure
            validateWorldStructure(worldJson);
            
            // If we reach this point, validation passed
            console.log("World validation successful after", attempts, "attempts");
            
            // Convert to our internal world structure
            const world = constructWorldStructure(worldJson);
            console.log('Final world structure contains:', 
                `${world.locations.size} locations,`,
                `${world.characters.size} characters,`,
                `${world.clues.size} clues`);

            console.log(JSON.stringify(world, null, 4));
            
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
 * Validates that the world structure matches the expected format
 */
function validateWorldStructure(world: APIWorldResponse): void {
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

function constructWorldStructure(raw: APIWorldResponse): World {
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
            role: raw_character.role,
            alibi: raw_character.alibi,
            knownClues: raw_character.knownClues ?? []
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

function generateGameState(world: World): GameState {
    // Setup initial game state
    return {
        currentLocation: null,
        currentCharacter: null,
        cluesFound: [],
        solved: false,
        isInConversation: false,
        dialogueHistory: {} // Initialize empty dialogue history
    };
}

export type GameState = {
    currentLocation: LocationID | null;
    currentCharacter: CharacterID | null;
    cluesFound: ClueID[];
    solved: boolean;
    isInConversation: boolean;
    dialogueHistory: Record<CharacterID, {
        role: string;
        content: string;
    }[]>;
};

export async function getNextDialogueWithCharacter(character: Character, world: World, state: GameState, input?: string, options: { model?: string; apiKey?: string } = {}): Promise<string> {
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
    let knownCluesDescription = '';
    if (character.knownClues && character.knownClues.length > 0) {
        knownCluesDescription = character.knownClues
            .map(clueId => {
                const clue = world.clues.get(clueId as ClueID);
                return clue ? clue.name : null;
            })
            .filter(Boolean)
            .join(', ');
    }
    
    // Create prompt based on character role and context
    let prompt = ``;
    if (character.role === 'victim') {
        return "You cannot speak with the victim.";
    }
    
    const cluesFoundByPlayer = state.cluesFound
        .map(clueId => {
            const clue = world.clues.get(clueId);
            return clue ? clue.name : null;
        })
        .filter(Boolean)
        .join(', ');
    
    // Customize prompt based on character role and player progress
    if (character.role === 'suspect') {
        prompt = `You are ${character.name}. ${character.description}. 
        Your alibi is: ${character.alibi ?? 'No alibi provided'}. 
        You know about these clues: ${knownCluesDescription ?? 'No specific clues'}. 
        The player has found these clues: ${cluesFoundByPlayer ?? 'No clues yet'}.
        You should be evasive if the player mentions clues that might incriminate you,
        but remain in character and provide helpful information about what you know.
        If you have nothing to say, you can say you have nothing to add.
        If there is no existing conversation start by intoducing yourself and asking how you can help.`;
    } else {
        // For witnesses
        prompt = `You are ${character.name}. ${character.description}. 
        Your alibi is: ${character.alibi ?? 'No alibi provided'}. 
        You know about these clues: ${knownCluesDescription ?? 'No specific clues'}.
        The player has found these clues: ${cluesFoundByPlayer ?? 'No clues yet'}.
        You should be helpful and provide information about what you know.
        If you have nothing to say, you can say you have nothing to add.
        If there is no existing conversation start by intoducing yourself and asking how you can help`;
    }
    
    // Get the victim and mystery information
    const mysteryContext = `The mystery is: ${world.mystery.title} - ${world.mystery.description}`;
    const victimContext = `The victim is: ${world.mystery.victim}`;
    const crimeContext = `The crime is: ${world.mystery.crime}`;

    prompt += `\n\n${mysteryContext}\n${victimContext}\n${crimeContext}`;

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

    const data = await response.json() as OpenRouterResponse;

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

// Import UI components from ui.tsx
import { renderMystwrightUI } from './ui';

async function gameLoop(world: World, state: GameState) {
    renderMystwrightUI(world, state);
}

// Start the game
// const world = await generateWorld();

const testData = await import('./test.json') as APIWorldResponse;
const world = constructWorldStructure(testData);
const state = generateGameState(world);
gameLoop(world, state);