import { useEffect } from "react";
import { WorldProvider } from "../context/world-context";
import { UserProvider } from "../context/user-context";

export default function Layout({ sidebar, children }: { sidebar?: React.ReactNode, children: React.ReactNode }) {
    // Apply dark mode by default to show the purple theme
    useEffect(() => {
        document.documentElement.classList.add('dark');
    }, []);
    
    return (
        <UserProvider>
            <WorldProvider>
                <div className="mystwright-app">
                    {sidebar}
                    {children}
                </div>
            </WorldProvider>
        </UserProvider>
    );
}