"use client"

import type { Character } from "@mystwright/types";
import type { DBWorld } from "@mystwright/db";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useUserContext } from "./user-context";

type WorldContextType = {
    worlds: DBWorld[]
    activeWorld: DBWorld | null
    setActiveWorld: (id: string) => void
    activeCharacter: Character | null
    setActiveCharacter: (id: string | null) => void
};

const WorldContext = createContext<WorldContextType | undefined>(undefined);

export function WorldProvider({ children }: { children: ReactNode }) {
    const [ worlds, setWorlds ] = useState<DBWorld[]>([]);
    const [ activeWorldId, setActiveWorldId ] = useState<string | null>();
    const { tokenSet } = useUserContext();

    useEffect(() => {
        if (tokenSet) {
            // Fetch worlds from the API using the token set
            fetchWorlds(tokenSet);
        }
    }
    , [tokenSet]);

    const fetchWorlds = async (tokenSet: any) => {
        try {
            const response = await fetch('/api/v1/worlds', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${tokenSet.access_token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch worlds');
            }

            const data = await response.json();
            setWorlds(data.worlds);
        } catch (error) {
            console.error("Error fetching worlds:", error);
        }
    }

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
