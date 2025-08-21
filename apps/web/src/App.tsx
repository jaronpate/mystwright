import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Page from './components/Page';
import './App.css';
import { StrictMode } from 'react';
import AppIntro from './components/AppIntro';
import Layout from './components/Layout';
import MystwrightSidebar from './components/Sidebar';
import Chat from './components/Chat';
import Login from './components/Login';
import Signup from './components/Signup';
import { UserProvider, useUserContext } from './context/user-context';
import { ProtectedRoute } from './components/ProtectedRoute';

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
            <Route path="/login" element={
                <Layout>
                    <Login />
                </Layout>
            } />
            <Route path="/signup" element={
                <Layout>
                    <Signup />
                </Layout>
            } />
            <Route path="/app" element={
                <ProtectedRoute>
                    <Layout sidebar={<MystwrightSidebar />}>
                        <Chat />
                    </Layout>
                </ProtectedRoute>
            } />
            {/* Add a catch-all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <StrictMode>
            <UserProvider>
                <BrowserRouter>
                    <AppRoutes />
                </BrowserRouter>
            </UserProvider>
        </StrictMode>
    )
}

export default App;
