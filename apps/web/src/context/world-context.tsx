"use client"

import type { Character } from "@mystwright/types";
import type { DBWorld, DBGameState } from "@mystwright/db";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useUserContext } from "./user-context";
import { useApi } from "../utils/api";

type WorldContextType = {
    worlds: DBWorld[]
    activeWorld: DBWorld | null
    setActiveWorld: (id: string) => void
    gameStates: DBGameState[],
    activeGameState: DBGameState | null
    setActiveGameState: (id: string) => void
    updateActiveGameState: (payload: DBGameState['payload']) => void
    activeCharacter: Character | null
    setActiveCharacter: (id: string | null) => void
    isSolving: boolean
    setIsSolving: (isSolving: boolean) => void
};

const WorldContext = createContext<WorldContextType | undefined>(undefined);

export function WorldProvider({ children }: { children: ReactNode }) {
    const [ worlds, setWorlds ] = useState<DBWorld[]>([]);
    const [ gameStates, setGameStates ] = useState<DBGameState[]>([]);
    const [ activeGameStateId, setActiveGameStateId ] = useState<string| null>(null);
    const [ activeWorldId, setActiveWorldId ] = useState<string | null>();
    const [ isSolving, setIsSolving ] = useState<boolean>(false);
    const { user } = useUserContext();
    const apiFetch = useApi();

    // If we have a user, fetch the worlds (remove when this is an authenticated page)
    useEffect(() => {
        if (user) {
            fetchWorlds();
        }
    }, [user]);

    // If we have an active world, fetch the game states
    useEffect(() => {
        if (activeWorldId) {
            fetchGameStates(activeWorldId);
        }
    }, [activeWorldId]);

    const activeWorld = worlds.find((m) => m.id === activeWorldId) ?? null;

    const fetchWorlds = async () => {
        try {
            const data = await apiFetch<{ worlds: DBWorld[] }>('/api/v1/worlds', { method: 'GET' });
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

    const activeGameState = gameStates.find((m) => m.id === activeGameStateId) ?? null;

    const updateActiveGameState = async (payload: DBGameState['payload']) => {
        if (activeWorldId === null) {
            console.error("No active world set");
            return;
        }

        if (activeGameStateId === null) {
            console.error("No active game state set");
            return;
        }

        const newGameStates = structuredClone(gameStates);
        const gameState = newGameStates.findIndex((m) => m.id === activeGameStateId);
        if (gameState !== -1) {
            newGameStates[gameState].payload = payload;
            setGameStates(newGameStates);
        }
    }

    const fetchGameStates = async (worldId: string) => {
        try {
            const data = await apiFetch<{ states: DBGameState[] }>(`/api/v1/worlds/${worldId}/states`, { method: 'GET' });
            setGameStates(data.states);
            // Right now im only allowing one active game state so we will set the first one we find as active
            const activeGameState = data.states.find((s) => s.world_id === activeWorldId) ?? null;
            if (activeGameState) {
                setActiveGameStateId(activeGameState.id);
            } else {
                // create a new game state
                const newGameState = await apiFetch<{ state: DBGameState }>(`/api/v1/worlds/${worldId}/states`, { method: 'POST' });
                setGameStates((prev) => [...prev, newGameState.state]);
                setActiveGameStateId(newGameState.state.id);
            }

        } catch (error) {
            console.error("Error fetching game states:", error);
        }
    }

    const setActiveGameState = (id: string) => {
        const gameState = gameStates.find((m) => m.id === id);

        if (gameState) {
            setActiveGameStateId(gameState.id);
        }
    }

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
                gameStates,
                activeGameState,
                setActiveGameState,
                updateActiveGameState,
                activeCharacter,
                setActiveCharacter,
                isSolving,
                setIsSolving,
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
