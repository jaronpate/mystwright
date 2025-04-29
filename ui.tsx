import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput, useApp, Newline } from 'ink';
import type { World, Location, Character, Clue, CharacterID, LocationID, ClueID } from './types';
import { getNextDialogueWithCharacter, type GameState } from '.';

type Message = {
    type: 'system' | 'user' | 'assistant'
    text: string;
    sender?: string; // Optional name of character or player
};

// UI Components
const InfoPanel = ({ world, state, height, width }: { world: World, state: GameState, height?: string | number, width?: string | number }) => {
    const { mystery, locations, characters, clues } = world;
    const currentLocation = state.currentLocation 
        ? locations.get(state.currentLocation) ?? null
        : null;
    
    return (
        <Box flexDirection="column" height={height} width={width} padding={1} borderStyle="classic" borderColor="white">
            <Box>
                <Text bold inverse color="blue">{mystery.title}</Text>
            </Box>
            <Newline />
            <Box>
                <Text>{mystery.description}</Text>
            </Box>
            <Newline />
            {/* Character list */}
            <Box flexDirection='row' marginBottom={1} gap={5}>
                <Box flexDirection="column">
                    <Text color="blue" bold underline>Suspects:</Text>
                    {Array.from(characters.values()).filter(c => c.role === 'suspect').map((character) => {
                        return (
                            <Text key={character.id} color="white">{character.name}</Text>
                        );
                    })}
                </Box>
                <Box flexDirection="column">
                    <Text color="blue" bold underline>Witnesses:</Text>
                    {Array.from(characters.values()).filter(c => c.role === 'witness').map((character) => {
                        return (
                            <Text key={character.id} color="white">{character.name}</Text>
                        );
                    })}
                </Box>
                <Box flexDirection="column">
                    <Text color="blue" bold underline>Victim:</Text>
                    {Array.from(characters.values()).filter(c => c.role === 'victim').map((character) => {
                        return (
                            <Text key={character.id} color="red">{character.name}</Text>
                        );
                    })}
                </Box>
                {/* Location list */}
                <Box flexDirection="column" marginBottom={1}>
                    <Text color="blue" bold underline>Points of Interest:</Text>
                    {Array.from(locations.values()).map((location) => {
                        return (
                            <Text key={location.id} color="white">{location.name}</Text>
                        );
                    })}
                </Box>
                {/* Known Clue list */}
                <Box flexDirection="column" marginBottom={1}>
                    <Text color="blue" bold underline>What you know:</Text>
                    {state.cluesFound.map(clueId => {
                        const clue = clues.get(clueId);

                        return (
                            <Text color="white">{clue ? clue.name : 'Unknown Clue'}</Text>
                        );
                    })}
                </Box>
                
                {currentLocation && (
                    <>
                        <Box>
                            <Text color="blue" bold>Location: {currentLocation.name}</Text>
                        </Box>
                        <Box>
                            <Text>{currentLocation.description}</Text>
                        </Box>
                        <Newline />
                    </>
                )}
            </Box>
        </Box>
    );
};

const ChatPanel = ({ 
    messages,
    input,
    setInput,
    onSubmit,
    gameState,
    world,
    height,
    width
}: { 
    messages: Array<Message>; 
    input: string;
    setInput: (input: string) => void,
    onSubmit: () => void,
    gameState: GameState,
    world: World,
    height?: string | number,
    width?: string | number
}) => {
    useInput((val, key) => {
        if (key.return) {
            onSubmit();
        } else if (key.backspace || key.delete) {
            if (input.length > 0) {
                if (key.meta) {
                    // Delete up to the last space
                    const lastSpaceIndex = input.lastIndexOf(' ');
                    if (lastSpaceIndex !== -1) {
                        setInput(input.slice(0, lastSpaceIndex));
                    } else {
                        setInput('');
                    }
                } else {
                    setInput(input.slice(0, -1));
                }
            }
        } else if (val && !key.ctrl && !key.meta) {
            setInput(input + val);
        }
    });

    const currentCharacter = (gameState.currentCharacter ? world.characters.get(gameState.currentCharacter) : null) ?? null;
    
    return (
        <Box flexDirection="column" height={height} width={width} paddingLeft={1}>
            {/* Chat History */}
            <Box 
                flexDirection="column" 
                flexGrow={1}
                padding={1}
            >

            {currentCharacter && (
                <>
                    <Box>
                        <Text color="cyan" bold inverse>Speaking with: {currentCharacter.name}</Text>
                    </Box>
                    <Box>
                        <Text>{currentCharacter.description}</Text>
                    </Box>
                </>
            )}

            {!currentCharacter && (
                <>
                    <Box>
                        <Text color="blue" bold inverse>Welcome to Mystwright: {world.mystery.title}</Text>
                    </Box>
                </>
            )}

                {messages.map((msg, i) => {
                    // Different styling based on message type
                    if (msg.type === 'system') {
                        return (
                            <Box flexDirection='column' key={i} width={'80%'}>
                                <Text inverse color="blue">{msg.text}</Text>
                            </Box>
                        );
                    } else if (msg.type === 'user') {
                        return (
                            <Box flexDirection='column' key={i} alignSelf='flex-end'>
                                <Text color="white">{msg.text}</Text>
                            </Box>
                        );
                    } else {
                        // NPC message 
                        return (
                            <Box flexDirection='column' key={i} marginY={1} width={'80%'}>
                                <Text>{msg.sender}: </Text>
                                <Text color="blue" inverse>{msg.text}</Text>
                            </Box>
                        );
                    }
                })}
            </Box>
            
            {/* Input prompt area */}
            <Box flexDirection="column" justifyContent='flex-end' alignItems='flex-start'>
                <Box borderStyle="round" borderColor="white" borderDimColor height={3} width="100%" paddingX={1}>
                    <Text color="white" dimColor>
                        {'> '}
                    </Text>
                    <Text>{input}</Text>
                </Box>
                <Box>
                    <Text color="white" dimColor>
                        {gameState.isInConversation 
                            ? 'Type a message or "/leave" to end conversation' 
                            : 'Type "/help" for available commands'}
                    </Text>
                </Box>
            </Box>
        </Box>
    );
};

const MystwrightUI = ({ world, state }: { world: World, state: GameState }) => {
    const { exit } = useApp();
    const [gameState, setGameState] = useState<GameState>(state);
    const [messages, setMessages] = useState<Array<Message>>([]);
    const [input, setInput] = useState('');
    
    // Add handler for terminal resize
    useEffect(() => {
        // Handler to update component dimensions when terminal is resized
        const handleResize = () => {
            // Force a re-render when terminal size changes
            setMessages([...messages]);
        };
        
        // Add event listener for terminal resize
        process.stdout.on('resize', handleResize);
        
        // Clean up event listener
        return () => {
            process.stdout.off('resize', handleResize);
        };
    }, [messages]);
    
    // Current character reference for easy access
    const currentCharacter = gameState.currentCharacter
        ? world.characters.get(gameState.currentCharacter) ?? null
        : null;
    
    const handleCommand = async () => {
        if (!input.trim()) return;

        // Clear input
        setInput('');

        if (input.startsWith('/')) {
            const strings = input.toLowerCase().slice(1).split(' ');
            const command = strings[0];
            const args = strings.slice(1);

            if (command === 'help') {
                setMessages(prev => [
                    ...prev,
                    {
                        type: 'system',
                        text: `\
Commands:
- [location name]: Go to a location
- [character name]: Talk to a character
- examine/look/search: Look for clues
- solve/accuse [character]: Name the culprit
- exit/quit: Exit the game
- help: Show this help message
`                       },
                ]);
            } else if (command === 'talkto') {
                const characterName = args.join(' ');
                const character = Array.from(world.characters.values()).find(c => c.name.toLowerCase().includes(characterName));

                if (character) {
                    setGameState(prev => ({
                        ...prev,
                        currentCharacter: character.id,
                        isInConversation: true
                    }));
                    setMessages([]);
                } else {
                    setMessages(prev => [
                        ...prev,
                        { type: 'system', text: `Character "${characterName}" not found.` }
                    ]);
                }
            } else {
                setMessages(prev => [
                    ...prev,
                    { type: 'system', text: `Unknown command: ${command}` }
                ]);
            }
        } else {
            // Add player message to chat history
            setMessages(prev => [...prev, { type: 'user', text: input }]);

            if (gameState.isInConversation && currentCharacter) {
                const response = await getNextDialogueWithCharacter(currentCharacter, world, gameState, input);

                if (response) {
                    setMessages(prev => [
                        ...prev,
                        { type: 'assistant', text: response, sender: currentCharacter.name }
                    ]);
                } else {
                    setMessages(prev => [
                        ...prev,
                        { type: 'system', text: `No response from ${currentCharacter.name}` }
                    ]);
                }
            } else {
                // Not in conversation - process normal game commands
            }
        }
    };
    
    return (
        <Box flexDirection="column" width="100%">
            <ChatPanel 
                messages={messages}
                input={input}
                setInput={setInput}
                onSubmit={handleCommand}
                gameState={gameState}
                world={world}
            />
            <InfoPanel world={world} state={gameState}/>
        </Box>
    );
};

// Export function to render the UI
export function renderMystwrightUI(world: World, state: GameState) {
    // Clear terminal
    process.stdout.write('\x1Bc');
    
    // Render full height UI using available options
    render(
        <MystwrightUI world={world} state={state} />, 
        { 
            stdout: process.stdout,
            exitOnCtrlC: true,
            patchConsole: true
        }
    );
}