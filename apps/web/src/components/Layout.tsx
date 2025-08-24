import { useEffect } from "react";
import { WorldProvider } from "../context/world-context";
import { UserProvider } from "../context/user-context";

export default function Layout({ children }: { children: React.ReactNode }) {
    // Apply dark mode by default to show the purple theme
    useEffect(() => {
        document.documentElement.classList.add('dark');
    }, []);
    
    return (
        <UserProvider>
            <WorldProvider>
                <div className="mystwright-app">
                    {children}
                </div>
            </WorldProvider>
        </UserProvider>
    );
}