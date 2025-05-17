import type { CharacterID, GameState, MessageUI, World } from '@mystwright/engine';
import { attemptSolve, getNextDialogueWithCharacter, JUDGE_CHARACTER_ID, JUDGE_VOICE, playVoiceForText } from '@mystwright/engine';
import { useEffect, useRef, useState } from 'react';
import '../styles/ChatPanel.scss';

interface ChatPanelProps {
  world: World;
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
}

export const ChatPanel = ({ world, gameState, setGameState }: ChatPanelProps) => {
  const [messages, setMessages] = useState<MessageUI[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Initialize with welcome message if no conversation
  useEffect(() => {
    if (!gameState.isInConversation && !gameState.isSolving && messages.length === 0) {
      setMessages([{
        role: 'system',
        content: `Welcome to Mystwright: ${world.mystery.title}`
      }]);
    }
  }, [gameState, world, messages]);
  
  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Current character reference
  const currentCharacter = gameState.currentCharacter
    ? world.characters.get(gameState.currentCharacter) ?? null
    : null;
  
  const helpCommand = () => {
    setMessages(prev => [
      ...prev,
      {
        role: 'system',
        content: `\
Commands:
- /help: Show this help message
- /clear: Clear the chat history
- /leave: Leave the current conversation
- /talkto <character>: Start a conversation with a character
- /solve <solution>: Attempt to solve the mystery`
      }
    ]);
  };
  
  const solveCommand = async (guess?: string) => {
    setGameState({
      ...gameState,
      isSolving: true
    });
    
    if (guess !== undefined && guess !== null && guess.length > 0) {
      setMessages([
        ...gameState.dialogueHistory['judge' as CharacterID] ?? [],
        { role: 'user', content: guess }
      ]);
      
      const result = await attemptSolve(world, gameState, guess);
      
      setGameState({
        ...gameState,
        solved: result.solved
      });
      
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: result.response }
      ]);
      
      try {
        await playVoiceForText(JUDGE_VOICE, result.response);
      } catch (error) {
        console.error('Failed to play voice:', error);
      }
    } else {
      setMessages(gameState.dialogueHistory[JUDGE_CHARACTER_ID] ?? []);
    }
  };
  
  const talkToCommand = async (characterName: string) => {
    const character = Array.from(world.characters.values()).find(c => 
      c.name.toLowerCase().includes(characterName.toLowerCase())
    );
    
    if (character) {
      setGameState({
        ...gameState,
        currentCharacter: character.id,
        isInConversation: true
      });
      
      setMessages(gameState.dialogueHistory[character.id] ?? []);
    } else {
      setMessages(prev => [
        ...prev,
        { role: 'system', content: `Character "${characterName}" not found.` }
      ]);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // Clear input
    const currentInput = input;
    setInput('');
    
    if (currentInput.startsWith('/')) {
      const strings = currentInput.toLowerCase().slice(1).split(' ');
      const command = strings[0];
      const args = strings.slice(1);
      
      if (command === 'help') {
        helpCommand();
      } else if (command === 'leave') {
        setGameState({
          ...gameState,
          currentCharacter: null,
          isInConversation: false,
          isSolving: false
        });
        
        setMessages([{ role: 'system', content: 'You have left the conversation.' }]);
      } else if (command === 'clear') {
        setMessages([]);
      } else if (command === 'solve') {
        const solution = args.join(' ').trim();
        await solveCommand(solution);
      } else if (command === 'talkto') {
        const characterName = args.join(' ').trim();
        talkToCommand(characterName);
      } else {
        setMessages(prev => [
          ...prev,
          { role: 'system', content: `Unknown command: ${command}` }
        ]);
      }
    } else {
      // Add player message to chat history
      setMessages(prev => [...prev, { role: 'user', content: currentInput }]);
      
      if (gameState.isSolving) {
        const result = await attemptSolve(world, gameState, currentInput);
        
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: result.response }
        ]);
        
        try {
          await playVoiceForText(JUDGE_VOICE, result.response);
        } catch (error) {
          console.error('Failed to play voice:', error);
        }
      } else if (gameState.isInConversation && currentCharacter) {
        const { response, state } = await getNextDialogueWithCharacter(
          currentCharacter, 
          world, 
          gameState, 
          currentInput
        );
        
        setGameState(state);
        
        if (response) {
          setMessages(prev => [
            ...prev,
            { role: 'assistant', content: response, sender: currentCharacter.name }
          ]);
          
          // Uncomment to enable voice
          // try {
          //   await playVoiceForText(currentCharacter.voice, response);
          // } catch (error) {
          //   console.error('Failed to play voice:', error);
          // }
        } else {
          setMessages(prev => [
            ...prev,
            { role: 'system', content: `No response from ${currentCharacter.name}` }
          ]);
        }
      }
    }
  };
  
  return (
    <div className="chat-panel">
      {/* Character info */}
      <div className="character-info">
        {currentCharacter && (
          <div>
            <h2>Speaking with: {currentCharacter.name}</h2>
            <p>{currentCharacter.description}</p>
          </div>
        )}
        
        {gameState.isSolving && (
          <div>
            <h2>Speaking with: The Judge</h2>
            <p>You must convince the judge of your solution.</p>
          </div>
        )}
        
        {!gameState.isInConversation && !gameState.isSolving && (
          <div>
            <h2>Welcome to Mystwright: {world.mystery.title}</h2>
          </div>
        )}
      </div>
      
      {/* Messages */}
      <div className="messages-container">
        {messages.map((msg, i) => {
          if (msg.role === 'system') {
            return (
              <div key={i} className="message system-message">
                {msg.content}
              </div>
            );
          } else if (msg.role === 'user') {
            return (
              <div key={i} className="message user-message">
                {msg.content}
              </div>
            );
          } else {
            // NPC message 
            return (
              <div key={i} className="message assistant-message">
                {(msg.sender || currentCharacter?.name) && (
                  <div className="message-sender">
                    {currentCharacter?.name ?? msg?.sender}:
                  </div>
                )}
                <div className="message-content">
                  {msg.content}
                </div>
              </div>
            );
          }
        })}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <div className="input-area">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={gameState.isInConversation 
              ? 'Type a message or "/leave" to end conversation' 
              : 'Type "/help" for available commands'}
          />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
};