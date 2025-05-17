import type { World, GameState } from '@mystwright/engine';
import '../styles/InfoPanel.scss';

interface InfoPanelProps {
  world: World;
  state: GameState;
}

export const InfoPanel = ({ world, state }: InfoPanelProps) => {
  const { mystery, locations, characters, clues } = world;
  const currentLocation = state.currentLocation 
      ? locations.get(state.currentLocation) ?? null
      : null;
  
  return (
    <div className="info-panel">
      <div className="info-header">
        <h1>{mystery.title}</h1>
      </div>
      
      <div className="info-description">
        <p>{mystery.description}</p>
      </div>
      
      <div className="info-content">
        {/* Character lists */}
        <div className="info-section">
          <h2>Suspects</h2>
          <ul>
            {Array.from(characters.values())
              .filter(c => c.role === 'suspect')
              .map((character) => (
                <li key={character.id}>{character.name}</li>
              ))
            }
          </ul>
        </div>
        
        <div className="info-section">
          <h2>Witnesses</h2>
          <ul>
            {Array.from(characters.values())
              .filter(c => c.role === 'witness')
              .map((character) => (
                <li key={character.id}>{character.name}</li>
              ))
            }
          </ul>
        </div>
        
        <div className="info-section">
          <h2>Victim</h2>
          <ul>
            {Array.from(characters.values())
              .filter(c => c.role === 'victim')
              .map((character) => (
                <li key={character.id} className="victim">{character.name}</li>
              ))
            }
          </ul>
        </div>
        
        {/* Locations list */}
        <div className="info-section">
          <h2>Points of Interest</h2>
          <ul>
            {Array.from(locations.values()).map((location) => (
              <li key={location.id}>{location.name}</li>
            ))}
          </ul>
        </div>
        
        {/* Known Clue list */}
        <div className="info-section">
          <h2>What you know</h2>
          <ul>
            {state.cluesFound.map(clueId => {
              const clue = clues.get(clueId);
              
              if (!clue) return null;
              
              return (
                <li key={clue.id}>{clue.name}</li>
              );
            })}
            {state.cluesFound.length === 0 && (
              <li className="no-clues">No clues found yet</li>
            )}
          </ul>
        </div>
      </div>
      
      {/* Current location */}
      {currentLocation && (
        <div className="current-location">
          <h2>Location: {currentLocation.name}</h2>
          <p>{currentLocation.description}</p>
        </div>
      )}
    </div>
  );
};