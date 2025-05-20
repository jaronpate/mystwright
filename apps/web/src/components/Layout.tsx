import { useEffect } from "react";
import { WorldProvider } from "../context/world-context";
import MystwrightSidebar from "./Sidebar";

export default function Layout({ sidebar, children }: { sidebar?: boolean, children: React.ReactNode }) {
    // Apply dark mode by default to show the purple theme
    // useEffect(() => {
    //     document.documentElement.classList.add('dark');
    // }, []);
    
    return (
        <WorldProvider>
            <div className="mystwright-app dark">
                {sidebar && <MystwrightSidebar />}
                {children}
            </div>
        </WorldProvider>
    );
}