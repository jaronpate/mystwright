import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import Chat from "./Chat";
import Layout from "./Layout";
import MystwrightSidebar from "./Sidebar";
import MystwrightJounal from "./Jounal";

export default function MystwrightGame() {
    const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
    const [rightSidebarOpen, setRightSidebarOpen] = useState(false);

    // Apply dark mode by default to show the purple theme
    useEffect(() => {
        document.documentElement.classList.add('dark');
    }, []);

    // Close sidebars when clicking outside on mobile
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (window.innerWidth <= 1200) {
                if (leftSidebarOpen && !target.closest('.sidebar') && !target.closest('#menu-btn')) {
                    setLeftSidebarOpen(false);
                }
                if (rightSidebarOpen && !target.closest('.journal') && !target.closest('#journal-btn')) {
                    setRightSidebarOpen(false);
                }
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [leftSidebarOpen, rightSidebarOpen]);

    // Handle escape key to close sidebars
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setLeftSidebarOpen(false);
                setRightSidebarOpen(false);
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);
    
    return (
        <Layout>
            <div className="game-container">
                {/* Mobile overlay */}
                {(leftSidebarOpen || rightSidebarOpen) && (
                    <div className="mobile-overlay" />
                )}

                <MystwrightSidebar isOpen={leftSidebarOpen} onClose={() => setLeftSidebarOpen(false)} />
                <Chat 
                    onOpenRightSidebar={() => setRightSidebarOpen(true)} 
                    onOpenLeftSidebar={() => setLeftSidebarOpen(true)} 
                />
                <MystwrightJounal isOpen={rightSidebarOpen} onClose={() => setRightSidebarOpen(false)} />
            </div>
        </Layout>
    );
}
