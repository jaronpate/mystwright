import type { DBWorld } from '@mystwright/db';
import { AlertTriangle, BookOpen, Gavel, Loader2, LogOut, Plus, Users } from 'lucide-react';
import { useUserContext } from '../context/user-context';
import { useWorldContext } from '../context/world-context';
import '../styles/Sidebar.scss';
import { Card, CollapsibleSection, SidebarHeader } from './ui';
import Logo from '/icon.png';

interface CrimeDetailsProps {
    world: DBWorld | null;
}

const CrimeDetails = ({ world }: CrimeDetailsProps) => {
    if (!world) {
        return <div className="nothing">No mystery selected</div>;
    }

    const victim = world.payload.characters.find(c => c.id === world.payload.mystery.victim);
    const location = world.payload.locations.find(l => l.id === world.payload.mystery.location_id);

    return (
        <>
            <div className="flex">
                <div className="crime-detail">
                    <div className="detail-title">Victim</div>
                    <div className="detail-value">{victim ? victim.name : 'Unknown'}</div>
                    {/* <div className="detail-value">{victim ? victim.description : 'No description...'}</div> */}
                </div>
            </div>
            <div className="flex">
                <div className="crime-detail">
                    <div className="detail-title">Crime</div>
                    <div className="detail-value">{world.payload.mystery.crime}</div>
                </div>
                <div className="crime-detail">
                    <div className="detail-title">Location</div>
                    <div className="detail-value">{location?.name ?? 'Unknown'}</div>
                </div>
                <div className="crime-detail">
                    <div className="detail-title">Time</div>
                    <div className="detail-value">{world.payload.mystery.time}</div>
                </div>
            </div>
            <div className="crime-detail">
                <div className="detail-title">Description</div>
                <div className="detail-value">{world.payload.mystery.description}</div>
            </div>
        </>
    );
};

interface MystwrightSidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function MystwrightSidebar({ isOpen = true, onClose }: MystwrightSidebarProps) {
    const {
        worlds,
        setActiveWorld,
        setActiveCharacter,
        activeWorld,
        activeCharacter,
        isSolving,
        setIsSolving,
        createWorld,
        isCreatingWorld,
    } = useWorldContext();
    const { user, logout } = useUserContext();

    const talkToJudge = () => {
        if (activeWorld) {
            setActiveCharacter(null); // Reset active character when starting to solve
            setIsSolving(!isSolving); // Toggle solving state
        }
    };

    const talkToCharacter = (characterId: string) => {
        if (activeWorld) {
            setActiveCharacter(characterId); // Set active character when talking to them
            setIsSolving(false); // Stop solving when talking to a character
        }
    };

    const handleLogout = () => {
        logout();
        window.location.href = '/';
    };

    return (
        <div className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-inner">
                <SidebarHeader
                    title="Mystwright"
                    icon={
                        // <Sparkles width={'24px'} height={'24px'} />
                        <img src={Logo} alt="Mystwright Logo" />
                    }
                    onClose={onClose}
                />
                <div className="sidebar-content">
                    {/* Worlds */}
                    <CollapsibleSection
                        title="Worlds"
                        icon={<BookOpen width={'16px'} height={'16px'} />}
                        displayWhenCollapsed={
                            activeWorld ? (
                                <Card
                                    key={activeWorld.id}
                                    title={activeWorld.title}
                                    description={activeWorld.short_description ?? 'No description...'}
                                    active={true}
                                    onClick={() => {
                                        setActiveCharacter(null);
                                        setActiveWorld(activeWorld.id);
                                    }}
                                />
                            ) : isCreatingWorld ? (
                                <Card
                                    key="create-new"
                                    title="Creating..."
                                    description="Generating your mystery..."
                                    disabled={true}
                                    icon={<Loader2 width={'16px'} height={'16px'} className="spin" />}
                                    noBorder={true}
                                />
                            ) : null
                        }
                    >
                        <Card
                            key="create-new"
                            title={isCreatingWorld ? 'Creating...' : 'Create New Mystery'}
                            description={
                                isCreatingWorld ? 'Generating your mystery...' : 'Start a new adventure'
                            }
                            onClick={createWorld}
                            disabled={isCreatingWorld}
                            icon={
                                <>
                                    {isCreatingWorld ? (
                                        <Loader2 width={'16px'} height={'16px'} className="spin" />
                                    ) : (
                                        <Plus width={'16px'} height={'16px'} />
                                    )}
                                </>
                            }
                            noBorder={true}
                        />
                        {worlds.map(world => (
                            <Card
                                key={world.id}
                                title={world.title}
                                description={world.short_description}
                                active={activeWorld?.id === world.id}
                                onClick={() => {
                                    setActiveCharacter(null);
                                    setActiveWorld(world.id);
                                }}
                            />
                        ))}
                    </CollapsibleSection>
                    {/* Crime Details */}
                    <CollapsibleSection title="Crime Details" icon={<AlertTriangle width={'16px'} height={'16px'} />}>
                        <CrimeDetails world={activeWorld} />
                    </CollapsibleSection>

                    {/* Judge */}
                    {activeWorld && (
                        <Card
                            title="The Judge"
                            description="Make your case!"
                            active={isSolving}
                            onClick={() => talkToJudge()}
                            noBorder={true}
                            icon={<Gavel width={'16px'} height={'16px'} />}
                        />
                    )}
                    {/* Characters */}
                    <CollapsibleSection
                        title="Characters"
                        icon={<Users width={'16px'} height={'16px'} />}
                        displayWhenCollapsed={
                            activeCharacter ? (
                                <div className="card-character">
                                    <Card
                                        title={activeCharacter.name}
                                        description={activeCharacter.description}
                                        active={true}
                                        onClick={() => talkToCharacter(activeCharacter.id)}
                                        noBorder={true}
                                        icon={
                                            <div className="character-avatar">
                                                {activeCharacter.image ? (
                                                    <img src={activeCharacter.image} alt={activeCharacter.name} />
                                                ) : (
                                                    activeCharacter.name.charAt(0)
                                                )}
                                            </div>
                                        }
                                    />
                                </div>
                            ) : null
                        }
                    >
                        {activeWorld === null ? (
                            <div className="nothing">No mystery selected</div>
                        ) : (
                            activeWorld.payload.characters.map(
                                character =>
                                    character.role !== 'victim' && (
                                        <div className="card-character" key={character.id}>
                                            <Card
                                                title={character.name}
                                                description={character.description}
                                                active={activeCharacter?.id === character.id}
                                                onClick={() => talkToCharacter(character.id)}
                                                noBorder={true}
                                                icon={
                                                    <>
                                                        {character.image ? (
                                                            <img src={character.image} alt={character.name} />
                                                        ) : (
                                                            character.name.charAt(0)
                                                        )}
                                                    </>
                                                }
                                            />
                                        </div>
                                    ),
                            )
                        )}
                    </CollapsibleSection>
                </div>

                {/* Logout Button */}
                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-name">{user ? user.first_name || user.email : 'Guest'}</div>
                        <button className="logout-button" onClick={handleLogout} title="Logout">
                            <LogOut width={'16px'} height={'16px'} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
