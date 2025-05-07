import { Box, Newline, render, Text, useApp, useInput } from 'ink';
import { useEffect, useState } from 'react';
import { attemptSolve, getNextDialogueWithCharacter } from './generation';
import { playVoiceForText } from './speech';
import type { CharacterID, GameState, MessageUI, World } from './types';
import { JUDGE_CHARACTER_ID, JUDGE_VOICE } from './constants';

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
    messages: Array<MessageUI>; 
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
                        if (input.endsWith(' ')) {
                            setInput(input.slice(0, lastSpaceIndex));
                        } else {
                            setInput(input.slice(0, lastSpaceIndex + 1));
                        }
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
                <Box flexDirection="column" width="100%" marginBottom={1}>
                    {currentCharacter && (
                        <Box flexDirection="column">
                            <Text color="cyan" bold inverse>Speaking with: {currentCharacter.name}</Text>
                            <Text>{currentCharacter.description}</Text>
                        </Box>
                    )}
                    
                    {gameState.isSolving && (
                        <Box flexDirection="column">
                            <Text color="cyan" bold inverse>Speaking with: The Judge</Text>
                            <Text color="white">You must convince the judge of your solution.</Text>
                        </Box>
                    )}
                    
                    {!gameState.isInConversation && !gameState.isSolving && (
                        <Box>
                            <Text color="blue" bold inverse>Welcome to Mystwright: {world.mystery.title}</Text>
                        </Box>
                    )}
                </Box>

                <Newline />

                {messages.map((msg, i) => {
                    // Different styling based on message type
                    if (msg.role === 'system') {
                        return (
                            <Box flexDirection='column' key={i} width={'80%'}>
                                <Text inverse color="blue">{msg.content}</Text>
                            </Box>
                        );
                    } else if (msg.role === 'user') {
                        return (
                            <Box flexDirection='column' key={i} alignSelf='flex-end'>
                                <Text color="white">{msg.content}</Text>
                            </Box>
                        );
                    } else {
                        // NPC message 
                        return (
                            <Box flexDirection='column' key={i} marginY={1} width={'80%'}>
                                {(msg.sender  || currentCharacter?.name) && (
                                    <Text>{currentCharacter?.name ?? msg?.sender}: </Text>
                                )}
                                <Text color="blue" inverse>{msg.content}</Text>
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
                    <Text>{input}</Text><Text color="white">█</Text>
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
    const [messages, setMessages] = useState<Array<MessageUI>>([]);
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
                        role: 'system',
                        content: `\
Commands:
- /help: Show this help message
- /exit: Exit the game
- /clear: Clear the chat history
- /leave: Leave the current conversation
- /talkto <character>: Start a conversation with a character
- /solve <solution>: Attempt to solve the mystery`
                    },
                ]);
            } else if (command === 'exit') {
                setMessages(prev => [
                    ...prev,
                    { role: 'system', content: 'Exiting the game...' }
                ]);
                clearTerm();
                // Exit the application
                exit();
            } else if (command === 'leave') {
                setGameState(prev => ({
                    ...prev,
                    currentCharacter: null,
                    isInConversation: false,
                    isSolving: false
                }));
                setMessages([{ role: 'system', content: 'You have left the conversation.' } ]);
                clearTerm();
            } else if (command === 'clear') {
                setMessages([]);
                clearTerm();
            } else if (command === 'solve') {
                const solution = args.join(' ').trim();

                setGameState(prev => ({
                    ...prev,
                    isSolving: true
                }));


                if (solution.length > 0) {
                    setMessages([
                        ...gameState.dialogueHistory['judge' as CharacterID] ?? [],
                        { role: 'user', content: solution }
                    ]);

                    const result = await attemptSolve(world, gameState, solution);
    
                    setGameState(prev => ({
                        ...prev,
                        solved: result.solved
                    }));
    
                    setMessages(prev => [
                        ...prev,
                        { role: 'assistant', content: result.response }
                    ]);

                    await playVoiceForText(JUDGE_VOICE, result.response);
                } else {
                    setMessages(gameState.dialogueHistory[JUDGE_CHARACTER_ID] ?? []);
                }
            } else if (command === 'talkto') {
                const characterName = args.join(' ');
                const character = Array.from(world.characters.values()).find(c => c.name.toLowerCase().includes(characterName));

                if (character) {
                    setGameState(prev => ({
                        ...prev,
                        currentCharacter: character.id,
                        isInConversation: true
                    }));
                    setMessages(gameState.dialogueHistory[character.id] ?? []);
                    clearTerm();
                } else {
                    setMessages(prev => [
                        ...prev,
                        { role: 'system', content: `Character "${characterName}" not found.` }
                    ]);
                }
            } else {
                setMessages(prev => [
                    ...prev,
                    { role: 'system', content: `Unknown command: ${command}` }
                ]);
            }
        } else {
            // Add player message to chat history
            setMessages(prev => [...prev, { role: 'user', content: input }]);

            if (gameState.isSolving) {
                const result = await attemptSolve(world, gameState, input);

                setMessages(prev => [
                    ...prev,
                    { role: 'assistant', content: result.response }
                ]);

                await playVoiceForText('Cornelius', result.response);
            } else if (gameState.isInConversation && currentCharacter) {
                const response = await getNextDialogueWithCharacter(currentCharacter, world, gameState, input);

                if (response) {
                    setMessages(prev => [
                        ...prev,
                        { role: 'assistant', content: response, sender: currentCharacter.name }
                    ]);
                    await playVoiceForText(currentCharacter.voice, response);
                } else {
                    setMessages(prev => [
                        ...prev,
                        { role: 'system', content: `No response from ${currentCharacter.name}` }
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
export function renderMystwrightTUI(world: World, state: GameState) {
    clearTerm();
    
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

function clearTerm(){
    // Clear terminal
    process.stdout.write('\x1Bc');
}