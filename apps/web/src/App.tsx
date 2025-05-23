import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Page from './components/Page';
import './App.css';
import { StrictMode } from 'react';
import AppIntro from './components/AppIntro';
import Layout from './components/Layout';
import MystwrightSidebar from './components/Sidebar';
import Chat from './components/Chat';

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
                <Layout sidebar={<MystwrightSidebar />}>
                    <Chat />
                </Layout>
            } />
            {/* Add a catch-all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

function App() {

    return (
        <StrictMode>
            <BrowserRouter>
                <AppRoutes />
            </BrowserRouter>
        </StrictMode>
    )
}

export default App;
