import { Sparkles, BookOpen, Users, UserSquare2, ChevronDown, ChevronUp } from "lucide-react";
import { useWorldContext } from "../context/world-context";
import { useState } from "react";
import "../styles/Sidebar.css";

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
    children: React.ReactNode;
};

const CollapsibleSection = ({ title, icon, children }: CollapsibleSectionProps) => {
    const [isOpen, setIsOpen] = useState(true);

    const toggleSection = () => {
        setIsOpen(!isOpen);
    };

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
            {isOpen && (
                <div className="sidebar-items">
                    {children}
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

export default function MystwrightSidebar() {
    const { worlds, setActiveWorld, setActiveCharacter, activeWorld, activeCharacter } = useWorldContext();

    return (
        <div className="sidebar">
            <div className="sidebar-inner">
                <SidebarHeader
                    title="Mystwright"
                    icon={<Sparkles width={'24px'} height={'24px'} />}
                />
                <div className="sidebar-content">
                    {/* Worlds */}
                    <CollapsibleSection
                        title="Worlds"
                        icon={<BookOpen width={'16px'} height={'16px'} />}
                    >
                        {worlds.map((world) => (
                            <Card
                                key={world.id}
                                title={world.title}
                                description={world.description ?? 'No description...'}
                                active={activeWorld?.id === world.id}
                                onClick={() => {setActiveCharacter(null); setActiveWorld(world.id)}}
                            />
                        ))}
                    </CollapsibleSection>
                    {/* Characters */}
                    {/* if a world is selected */}
                    <CollapsibleSection
                        title="Characters"
                        icon={<Users width={'16px'} height={'16px'} />}
                    >
                        {!activeWorld ? (
                            <div className="nothing">
                                No world selected
                            </div>
                        ) : (
                            activeWorld.payload.characters.map((character) => (
                                <Card
                                    key={character.id}
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
                            ))
                        )}
                    </CollapsibleSection>
                </div>
            </div>
        </div>
    );
}