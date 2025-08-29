import React from 'react';
import { X } from 'lucide-react';

export type SidebarHeaderProps = {
    title: string;
    icon?: React.ReactNode;
    onClose?: () => void;
    className?: string;
};

export const SidebarHeader = ({ title, icon, onClose, className = '' }: SidebarHeaderProps) => {
    return (
        <div className={`sidebar-header ${className}`}>
            <div className="wordmark">
                {icon}
                <div className="text-large">{title}</div>
            </div>
            {onClose && (
                <button className="mobile-close-button" onClick={onClose} aria-label="Close sidebar">
                    <X size={20} />
                </button>
            )}
        </div>
    );
};

export default SidebarHeader;
