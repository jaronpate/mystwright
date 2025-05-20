import { WorldProvider } from "../context/world-context";
import MystwrightSidebar from "./Sidebar";

export default function Layout({ sidebar, children }: { sidebar?: boolean, children: React.ReactNode }) {
    return (
        <WorldProvider>
            <div className="mystwright-app dark">
                {sidebar && <MystwrightSidebar />}
                {children}
            </div>
        </WorldProvider>
    );
}