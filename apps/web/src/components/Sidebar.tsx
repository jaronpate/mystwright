import type { DBWorld } from '@mystwright/db';
import { AlertTriangle, BookOpen, ChevronDown, ChevronUp, Gavel, Loader2, LogOut, Plus, Users } from 'lucide-react';
import { useState } from 'react';
import { useUserContext } from '../context/user-context';
import { useWorldContext } from '../context/world-context';
import '../styles/Sidebar.scss';
import Logo from '/icon.png';

type SidebarHeaderProps = {
    title: string;
    icon: React.ReactNode;
};

const SidebarHeader = ({ title, icon }: SidebarHeaderProps) => {
    return (
        <div className="sidebar-header">
            <div className="wordmark">
                {icon}
                <div className="text-large">{title}</div>
            </div>
        </div>
    );
};

type CollapsibleSectionProps = {
    title: string;
    icon: React.ReactNode;
    children:
        | React.ReactNode
        | ((isOpen: boolean, setIsOpen: (value: React.SetStateAction<boolean>) => void) => React.ReactNode);
    alwaysShowWhenActive?: boolean;
    isActive?: boolean;
};

const CollapsibleSection = ({
    title,
    icon,
    children,
    alwaysShowWhenActive = false,
    isActive = false,
}: CollapsibleSectionProps) => {
    const [isOpen, setIsOpen] = useState(true);
    const [isAnimating, setIsAnimating] = useState(false);

    const toggleSection = () => {
        if (isOpen) {
            setIsAnimating(true);
            setTimeout(() => {
                setIsOpen(false);
                setIsAnimating(false);
            }, 200);
        } else {
            setIsOpen(true);
        }
    };

    // Determine if content should be shown
    const showContent = isOpen || (alwaysShowWhenActive && isActive) || isAnimating;

    return (
        <div className="sidebar-collapsable">
            <div className="sidebar-title" onClick={toggleSection}>
                <div className="sidebar-title-icon">{icon}</div>
                <div className="sidebar-title-text">{title}</div>
                <div className="ff"></div>
                <div className="sidebar-title-icon sidebar-chevron">
                    {isOpen ? (
                        <ChevronDown width={'16px'} height={'16px'} />
                    ) : (
                        <ChevronUp width={'16px'} height={'16px'} />
                    )}
                </div>
            </div>
            {showContent && (
                <div className={`sidebar-items ${isAnimating ? 'closing' : ''}`}>
                    {typeof children === 'function' ? children(isOpen, setIsOpen) : children}
                </div>
            )}
        </div>
    );
};

type CardProps = {
    title: string;
    description: string;
    active?: boolean;
    noBorder?: boolean;
    onClick?: () => void;
    icon?: React.ReactNode;
    disabled?: boolean;
};

const Card = ({ title, description, active, noBorder, onClick, icon, disabled }: CardProps) => {
    return (
        <div className="sidebar-item" onClick={disabled ? undefined : onClick}>
            <div
                className={`card ${onClick && !disabled ? 'clickable' : ''} ${active ? 'active' : ''} ${
                    noBorder ? 'no-border' : ''
                } ${disabled ? 'disabled' : ''}`}
            >
                {icon && <div className="card-icon">{icon}</div>}
                <div className="card-content">
                    <div className="card-title">{title}</div>
                    <div className="card-subtitle">{description}</div>
                </div>
            </div>
        </div>
    );
};

interface CrimeDetailsProps {
    world: DBWorld | null;
}

const CrimeDetails = ({ world }: CrimeDetailsProps) => {
    if (!world) {
        return <div className="nothing">No world selected</div>;
    }

    const victim = world.payload.characters.find(c => c.id === world.payload.mystery.victim);

    return (
        <>
            <div className="flex">
                <div className="crime-detail">
                    <div className="detail-title">Victim</div>
                    <div className="detail-value">{victim ? victim.name : 'Unknown'}</div>
                    <div className="detail-value">{victim ? victim.description : 'No description...'}</div>
                </div>
            </div>
            <div className="flex">
                <div className="crime-detail">
                    <div className="detail-title">Crime</div>
                    <div className="detail-value">{world.payload.mystery.crime}</div>
                </div>
                <div className="crime-detail">
                    <div className="detail-title">Location</div>
                    <div className="detail-value">{world.payload.mystery.location}</div>
                </div>
                <div className="crime-detail">
                    <div className="detail-title">Time</div>
                    <div className="detail-value">{world.payload.mystery.time}</div>
                </div>
            </div>
        </>
    );
};

export default function MystwrightSidebar() {
    const { worlds, setActiveWorld, setActiveCharacter, activeWorld, activeCharacter, isSolving, setIsSolving, createWorld, isCreatingWorld } =
        useWorldContext();
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
        <div className="sidebar">
            <div className="sidebar-inner">
                <SidebarHeader
                    title="Mystwright"
                    icon={
                        // <Sparkles width={'24px'} height={'24px'} />
                        <img src={Logo} alt="Mystwright Logo" />
                    }
                />
                <div className="sidebar-content">
                    {/* Worlds */}
                    <CollapsibleSection
                        title="Worlds"
                        icon={<BookOpen width={'16px'} height={'16px'} />}
                        alwaysShowWhenActive={true}
                        isActive={activeWorld !== null}
                    >
                        {(isOpen, setIsOpen) =>
                            isOpen
                                ? // Show all worlds when expanded
                                  [
                                      <Card
                                          key="create-new"
                                          title={isCreatingWorld ? "Creating..." : "Create New Mystery"}
                                          description={isCreatingWorld ? "Generating your mystery..." : "Start a new adventure"}
                                          onClick={createWorld}
                                          disabled={isCreatingWorld}
                                          icon={
                                              <div className="character-avatar">
                                                  {isCreatingWorld ? (
                                                      <Loader2 width={'16px'} height={'16px'} className="spin" />
                                                  ) : (
                                                      <Plus width={'16px'} height={'16px'} />
                                                  )}
                                              </div>
                                          }
                                          noBorder={true}
                                      />,
                                      ...worlds.map(world => (
                                          <Card
                                              key={world.id}
                                              title={world.title}
                                              description={world.short_description}
                                              active={activeWorld?.id === world.id}
                                              onClick={() => {
                                                  setActiveCharacter(null);
                                                  setActiveWorld(world.id);
                                                  setIsOpen(false);
                                              }}
                                          />
                                      ))
                                  ]
                                : // Show only active world when collapsed or create button when creating
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
                                          icon={
                                              <div className="character-avatar">
                                                  <Loader2 width={'16px'} height={'16px'} className="spin" />
                                              </div>
                                          }
                                          noBorder={true}
                                      />
                                  ) : null
                        }
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
                            icon={
                                <div className="character-avatar">
                                    <Gavel width={'16px'} height={'16px'} />
                                </div>
                            }
                        />
                    )}
                    {/* Characters */}
                    <CollapsibleSection
                        title="Characters"
                        icon={<Users width={'16px'} height={'16px'} />}
                        alwaysShowWhenActive={true}
                        isActive={activeCharacter !== null}
                    >
                        {isOpen =>
                            activeWorld === null ? (
                                <div className="nothing">No world selected</div>
                            ) : isOpen ? (
                                // Show all characters when expanded
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
                                                        <div className="character-avatar">
                                                            {character.image ? (
                                                                <img src={character.image} alt={character.name} />
                                                            ) : (
                                                                character.name.charAt(0)
                                                            )}
                                                        </div>
                                                    }
                                                />
                                            </div>
                                        ),
                                )
                            ) : (
                                // Show only active character when collapsed
                                activeCharacter && (
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
                                )
                            )
                        }
                        {/* {!activeWorld ? (
                            <div className="nothing">
                                No world selected
                            </div>
                        ) : (
                            activeWorld.payload.characters.map((character) => character.role !== 'victim' && (
                                <div className="card-character" key={character.id}>
                                    <Card
                                        title={character.name}
                                        description={character.description}
                                        active={activeCharacter?.id === character.id}
                                        onClick={() => setActiveCharacter(character.id)}
                                        noBorder={true}
                                        icon={
                                            <div className="character-avatar">
                                                {character.name.charAt(0)}
                                            </div>
                                        }
                                    />
                                </div>
                            ))
                        )} */}
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
