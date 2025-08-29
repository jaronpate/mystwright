import type { GameStatePayload } from '@mystwright/db';
import { WorldPayload } from '@mystwright/types';
import { Glasses, PenBox } from 'lucide-react';
import { useWorldContext } from '../context/world-context';
import '../styles/Journal.scss';
import { Card, CollapsibleSection, SidebarHeader } from './ui';

interface MystwrightJournalProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function MystwrightJounal({ isOpen = true, onClose }: MystwrightJournalProps) {
    const { activeWorld, activeGameState } = useWorldContext();

    const world = (activeWorld?.payload ?? null) as WorldPayload | null;
    const gameState = (activeGameState?.payload ?? null) as GameStatePayload | null;

    const discoverdClues = [];

    if (world && gameState) {
        for (const clueId of gameState.cluesFound) {
            const clue = world.clues.find(c => c.id === clueId);
            if (clue) {
                discoverdClues.push(clue);
            }
        }
    }

    return (
        <div className={`journal ${isOpen ? 'open' : ''}`}>
            <div className="journal-inner">
                <SidebarHeader title="Journal" icon={<PenBox width={'24px'} height={'24px'} />} onClose={onClose} />
                <div className="sidebar-content">
                    <CollapsibleSection
                        title="Discoved Clues"
                        icon={<Glasses width={'16px'} height={'16px'} />}
                    >
                        {gameState ? (
                            discoverdClues.length === 0 ? (
                                <div className="nothing">You haven't discovered any clues yet.</div>
                            ) : (
                                discoverdClues.map(clue => (
                                    <Card
                                        key={clue.id}
                                        title={clue.name}
                                        active={false}
                                        onClick={() => {}}
                                        noBorder={true}
                                        icon={
                                            <div className="clue-image">
                                                <img src={clue.image} alt={clue.name} />
                                            </div>
                                        }
                                    />
                                ))
                            )
                        ) : (
                            <div className="nothing">No mystery selected</div>
                        )}
                    </CollapsibleSection>
                </div>
            </div>
        </div>
    );
}
