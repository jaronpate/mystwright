"use client"

import type { Character } from "@mystwright/types";
import type { DBWorld } from "@mystwright/db";
import { createContext, useContext, useState, type ReactNode } from "react";

// Sample data
const initialWorlds: DBWorld[] = [
    {
        id: "1",
        title: "The Art of Deception",
        description: "This is the first world.",
        payload: {
            characters: [
                { id: "1", name: "Character 1", description: "This is character 1." },
                { id: "2", name: "Character 2", description: "This is character 2." },
            ],
            // Add other properties as needed
        },
    },
    {
        id: "2",
        title: "The GenTech Labs Conspiracy",
        description: "This is the second world.",
        payload: {
            characters: [
                { id: "3", name: "Character 3", description: "This is character 3." },
                { id: "4", name: "Character 4", description: "This is character 4." },
            ],
            // Add other properties as needed
        },
    }
];

type WorldContextType = {
    worlds: DBWorld[]
    activeWorld: DBWorld | null
    setActiveWorld: (id: string) => void
    activeCharacter: Character | null
    setActiveCharacter: (id: string | null) => void
};

const WorldContext = createContext<WorldContextType | undefined>(undefined);

export function WorldProvider({ children }: { children: ReactNode }) {
    const [worlds] = useState<DBWorld[]>(initialWorlds);
    const [activeWorldId, setActiveWorldId] = useState<string | null>();

    const setActiveWorld = (id: string) => {
        const world = worlds.find((m) => m.id === id)
        if (world) {
            setActiveWorldId(world.id);
        }
    }

    const activeWorld = worlds.find((m) => m.id === activeWorldId) || null

    const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null)

    const setActiveCharacter = (id: string | null) => {
        if (id === null) {
            setActiveCharacterId(null);
            return;
        }

        if (activeWorldId === null) {
            console.error("No active world set");
            return;
        }

        const characters = activeWorld?.payload.characters ?? [];
        const character = characters.find((c) => c.id === id);

        if (character) {
            setActiveCharacterId(character.id);
        }
    }

    const activeCharacter = (activeWorld?.payload.characters.find((c) => c.id === activeCharacterId) ?? null) as Character | null;

    return (
        <WorldContext.Provider
            value={{
                worlds,
                activeWorld,
                setActiveWorld,
                activeCharacter,
                setActiveCharacter
            }}
        >
            {children}
        </WorldContext.Provider>
    );
};

export function useWorldContext() {
    const context = useContext(WorldContext)
    if (context === undefined) {
        throw new Error("useWorldContext must be used within a WorldProvider");
    }
    return context
};
