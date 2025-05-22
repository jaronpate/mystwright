import type { WorldPayload, LocationID, Location, CharacterID, Character, ClueID, Clue, World, GameState } from "./types";

export * from "./types";
export * from "./constants";

/**
 * Constructs the world structure from the raw API response.
 * @param raw - The raw API response object
 * @returns The constructed world object
 */
export function deserializeWorldStructure(raw: WorldPayload): World {
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

export function serializeWorldStructure(raw: World): WorldPayload {
    // Convert branded types back to strings
    const locations = Array.from(raw.locations.values()).map(location => ({
        id: location.id as string,
        name: location.name,
        description: location.description,
        connectedLocations: location.connectedLocations,
        clues: location.clues,
        characters: location.characters
    }));

    const characters = Array.from(raw.characters.values()).map(character => ({
        id: character.id as string,
        name: character.name,
        description: character.description,
        personality: character.personality,
        voice: character.voice,
        role: character.role,
        alibi: character.alibi,
        knownClues: character.knownClues
    }));
    
    const clues = Array.from(raw.clues.values()).map(clue => ({
        id: clue.id as string,
        name: clue.name,
        description: clue.description,
        type: clue.type
    }));
    
    return {
        locations,
        characters,
        clues,
        mystery: raw.mystery,
        solution: raw.solution
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
        isSolving: false,
        memories: [],
        dialogueHistory: {}
    };
}