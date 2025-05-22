import { Sparkles, BookOpen, Users, UserSquare2, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { useWorldContext } from "../context/world-context";
import { useState } from "react";
import "../styles/Sidebar.css";
import Logo from '/icon.png';
import type { DBWorld } from "@mystwright/db";

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
    children: React.ReactNode | ((isOpen: boolean) => React.ReactNode);
    alwaysShowWhenActive?: boolean;
    isActive?: boolean;
};

const CollapsibleSection = ({ 
    title, 
    icon, 
    children, 
    alwaysShowWhenActive = false, 
    isActive = false 
}: CollapsibleSectionProps) => {
    const [isOpen, setIsOpen] = useState(true);

    const toggleSection = () => {
        setIsOpen(!isOpen);
    };
    
    // Determine if content should be shown
    const showContent = isOpen || (alwaysShowWhenActive && isActive);

    return (
        <div className="sidebar-collapsable">
            <div className="sidebar-title" onClick={toggleSection}>
                <div className="sidebar-title-icon">
                    {icon}
                </div>
                <div className="sidebar-title-text">{title}</div>
                <div className="ff"></div>
                <div className="sidebar-title-icon sidebar-chevron">
                    {isOpen ?
                        <ChevronDown width={'16px'} height={'16px'} /> :
                        <ChevronUp width={'16px'} height={'16px'} />
                    }
                </div>
            </div>
            {showContent && (
                <div className="sidebar-items">
                    {typeof children === 'function' ? children(isOpen) : children}
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
};

const Card = ({ title, description, active, noBorder, onClick, icon }: CardProps) => {
    return (
        <div className="sidebar-item" onClick={onClick}>
            <div className={`card ${onClick ? 'clickable' : ''} ${active ? 'active' : ''} ${noBorder ? 'no-border' : ''}`}>
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
        return (
            <div className="nothing">
                No world selected
            </div>
        );
    }

    const victim = world.payload.characters.find(c => c.id === world.payload.mystery.victim);
    
    return (
        <div className="flex">
            <Card
                title="Victim"
                description={victim ? victim.name : 'Unknown'}
                noBorder={true}
            />
            <Card
                title="Crime"
                description={world.payload.mystery.crime}
                noBorder={true}
            />
        </div>
    );
};

export default function MystwrightSidebar() {
    const { worlds, setActiveWorld, setActiveCharacter, activeWorld, activeCharacter } = useWorldContext();

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
                        {isOpen => 
                            isOpen ? (
                                // Show all worlds when expanded
                                worlds.map((world) => (
                                    <Card
                                        key={world.id}
                                        title={world.title}
                                        description={world.description ?? 'No description...'}
                                        active={activeWorld?.id === world.id}
                                        onClick={() => {setActiveCharacter(null); setActiveWorld(world.id)}}
                                    />
                                ))
                            ) : (
                                // Show only active world when collapsed
                                activeWorld && (
                                    <Card
                                        key={activeWorld.id}
                                        title={activeWorld.title}
                                        description={activeWorld.description ?? 'No description...'}
                                        active={true}
                                        onClick={() => {setActiveCharacter(null); setActiveWorld(activeWorld.id)}}
                                    />
                                )
                            )
                        }
                    </CollapsibleSection>
                    {/* Crime Details */}
                    <CollapsibleSection
                        title="Crime Details"
                        icon={<AlertTriangle width={'16px'} height={'16px'} />}
                    >
                        <CrimeDetails world={activeWorld} />
                    </CollapsibleSection>

                    {/* Characters */}
                    <CollapsibleSection
                        title="Characters"
                        icon={<Users width={'16px'} height={'16px'} />}
                    >
                        {!activeWorld ? (
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
                        )}
                    </CollapsibleSection>
                </div>
            </div>
        </div>
    );
}