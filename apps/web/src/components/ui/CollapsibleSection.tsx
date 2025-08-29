import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export type CollapsibleSectionProps = {
    title: string;
    icon?: React.ReactNode;
    children?: React.ReactNode;
    displayWhenCollapsed?: React.ReactNode;
    className?: string;
};

export const CollapsibleSection = ({
    title,
    icon,
    children,
    displayWhenCollapsed,
    className = ''
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
    const showExpandedContent = isOpen || isAnimating;
    const showCollapsedContent = !isOpen && !isAnimating && displayWhenCollapsed;

    return (
        <div className={`sidebar-collapsable ${className}`}>
            <div className="sidebar-title" onClick={toggleSection}>
                {icon && <div className="sidebar-title-icon">{icon}</div>}
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
            {showExpandedContent && (
                <div className={`sidebar-items ${isAnimating ? 'closing' : ''}`}>
                    {children}
                </div>
            )}
            {showCollapsedContent && (
                <div className="sidebar-items">
                    {displayWhenCollapsed}
                </div>
            )}
        </div>
    );
};

export default CollapsibleSection;
