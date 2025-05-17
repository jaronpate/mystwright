import { useEffect, useState } from 'react';
import type { GameState, World, APIWorldResponse } from '@mystwright/engine';
import { InfoPanel } from './components/InfoPanel';
import { ChatPanel } from './components/ChatPanel';
import './styles/App.scss';

// In a real app, these would be fetched from an API
import testData from '../../../gens/The GenTech Labs Conspiracy/world.json';
import { constructGameState, constructWorldStructure } from '@mystwright/engine';

function App() {
  const [world, setWorld] = useState<World | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, this would be an API call
    const loadData = async () => {
      try {
        const world = constructWorldStructure(testData as unknown as APIWorldResponse);
        const state = constructGameState(world);
        
        setWorld(world);
        setGameState(state);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load game data:', error);
      }
    };

    loadData();
  }, []);

  if (loading || !world || !gameState) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app-container">
      <div className="main-layout">
        <ChatPanel 
          world={world} 
          gameState={gameState} 
          setGameState={setGameState} 
        />
        <InfoPanel 
          world={world} 
          state={gameState} 
        />
      </div>
    </div>
  );
}

export default App;