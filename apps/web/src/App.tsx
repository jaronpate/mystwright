import { BrowserRouter, Router, Routes, Route, Navigate, useLocation } from 'react-router';
import { WorldProvider } from './context/world-context';
import MystwrightSidebar from './components/Sidebar';
import MainPage from './components/MainPage';
import './App.css';
import { useEffect } from 'react';

function AppRoutes() {
    // const location = useLocation();

    // Save the current path when it changes
    // useEffect(() => {
    //     if (location.pathname.startsWith('/app')) {
    //         localStorage.setItem(LAST_PATH_KEY, location.pathname);
    //     }
    // }, [location]);

    return (
        <Routes>
            <Route path="/" element={
                <Layout>
                    <AppIntro />
                </Layout>
            } />
            {/* <Route path="/login" element={<Login />} /> */}
            {/* <Route path="/signup" element={<Signup />} /> */}
            <Route path="/app" element={
                <Layout sidebar>
                    <MainPage />
                </Layout>
            } />
            {/* Add a catch-all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

function Layout({ sidebar, children }: { sidebar?: boolean, children: React.ReactNode }) {
    return (
        <WorldProvider>
            {sidebar && <MystwrightSidebar />}
            {children}
        </WorldProvider>
    );
}

function AppIntro() {
    return (
        <MainPage />
    );
}

function App() {
    return (
        <BrowserRouter>
            <div className="mystwright-app dark">
                <AppRoutes />
            </div>
        </BrowserRouter>
    )
}

export default App;
