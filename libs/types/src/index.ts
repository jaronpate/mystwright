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
        const location = raw_location as Location;
        locations.set(location.id, location);
    }

    const characters = new Map<CharacterID, Character>();

    for (const raw_character of raw.characters) {
        const character = Object.assign({ knownClues: [] }, raw_character) as Character;
        characters.set(character.id, character);
    }
    
    const clues = new Map<ClueID, Clue>();

    for (const raw_clue of raw.clues) {
        const clue = raw_clue as Clue;
        clues.set(clue.id, clue);
    }
    
    // Construct the world object
    return {
        locations,
        characters,
        clues,
        mystery: raw.mystery,
        solution: raw.solution
    };
}

export function serializeWorldStructure(raw: World): WorldPayload {    
    return {
        locations: Array.from(raw.locations.values()),
        characters: Array.from(raw.characters.values()),
        clues: Array.from(raw.clues.values()),
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