import React from 'react';

export type CardProps = {
    title: string;
    description?: string;
    active?: boolean;
    noBorder?: boolean;
    onClick?: () => void;
    icon?: React.ReactNode;
    disabled?: boolean;
    className?: string;
};

export const Card = ({ 
    title, 
    description, 
    active, 
    noBorder, 
    onClick, 
    icon, 
    disabled, 
    className = '' 
}: CardProps) => {
    return (
        <div
            onClick={disabled ? undefined : onClick}
            className={`card ${onClick && !disabled ? 'clickable' : ''} ${active ? 'active' : ''} ${
                noBorder ? 'no-border' : ''
            } ${disabled ? 'disabled' : ''} ${className}`}
        >
            {icon && <div className="card-icon">{icon}</div>}
            <div className="card-content">
                <div className="card-title">{title}</div>
                {description && <div className="card-subtitle">{description}</div>}
            </div>
        </div>
    );
};

export default Card;
