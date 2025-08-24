import { useEffect } from "react";
import Chat from "./Chat";
import Layout from "./Layout";
import MystwrightSidebar from "./Sidebar";
import MystwrightJounal from "./Jounal";

export default function MystwrightGame() {
    // Apply dark mode by default to show the purple theme
    useEffect(() => {
        document.documentElement.classList.add('dark');
    }, []);
    
    return (
        <Layout>
            <MystwrightSidebar />
            <Chat />
            <MystwrightJounal />
        </Layout>
    );
}