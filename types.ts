export type Brand<T, K> = T & { __brand: K };
export type ID = Brand<string, 'UUID'>;
export type ClueID = Brand<string, 'clue'>;
export type CharacterID = Brand<string, 'character'>;
export type LocationID = Brand<string, 'location'>;

export interface Mystery {
    title: string;
    description: string;
    victim: string;
    crime: string;
}

export interface Location {
    id: LocationID;
    name: string;
    description: string;
    connectedLocations: string[]; // like Place connections
    clues: string[];              // Clues present here
    characters: string[];         // IDs of characters found here
}

export interface Character {
    id: CharacterID;
    name: string;
    description: string;
    personality: string;
    voice: string;
    role: 'suspect' | 'witness' | 'victim';
    alibi?: string;
    knownClues?: string[];         // IDs of clues they know about
}

export interface Clue {
    id: ClueID;
    name: string;
    description: string;
    type: 'physical' | 'testimony' | "other";
}

export interface Solutuion {
    culpritId: CharacterID;
    motive?: string;
    method?: string;
}

export interface World {
    locations: Map<LocationID, Location>
    characters: Map<CharacterID, Character>
    clues: Map<ClueID, Clue>;
    mystery: Mystery;
    solution: Solutuion;
}