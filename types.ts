export type Brand<T, K> = T & { __brand: K };
export type ID = Brand<string, 'UUID'>;
export type ItemID = Brand<string, 'item'>;
export type NPCID = Brand<string, 'npc'>;
export type PlaceID = Brand<string, 'place'>;
export type QuestID = Brand<string, 'quest'>;

export type ItemType = 'consumable' | 'equipment' | 'weapon';

export interface Item {
    id: ItemID;
    name: string;
    description: string;
    type: ItemType;
    effect?: (player: Player, enemy: NPC) => void; // Optional, runtime only
}

export interface NPC {
    id: NPCID;
    name: string;
    description: string;
    dialogueSeed: string; // Used to prompt dynamic conversations
    inventory?: ItemID[];   // Items they can trade or gift
    hp: number;        // Health points
    maxHp: number;    // Maximum health points
    attack: number;   // Attack power
    placeId: PlaceID; // Place they are located
    questId?: QuestID;     // Quest they offer (optional)
}

export interface Place {
    id: PlaceID;
    name: string;
    description: string;
    connections: PlaceID[]; // Array of connected place IDs
    items: ItemID[];       // Array of Item IDs present here
}

export type QuestStatus = 'not_started' | 'in_progress' | 'completed';

export interface Quest {
    id: QuestID;
    name: string;
    description: string;
    objective: string;     // e.g., "Retrieve the Mysterious Amulet"
    requiredItemId?: ItemID; // If item collection is needed
    destinationPlaceId?: PlaceID; // If reaching a place is needed
    rewardItemId?: ItemID;    // Item rewarded upon completion
}

export interface World {
    places: Map<PlaceID, Place>;
    npcs: Map<NPCID, NPC>;
    items: Map<ItemID, Item>;
    quests: Map<QuestID, Quest>;
}

export interface Player {
    name: string;
    currentPlaceId: PlaceID;
    inventory: ItemID[];
    quests: Record<QuestID, QuestStatus>;
    hp: number;
    maxHp: number;
}

export interface GameSave {
    world: World;
    player: Player;
    timestamp: Date; // ISO format
}