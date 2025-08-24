import { StrictMode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.scss';
import AppIntro from './components/AppIntro';
import Layout from './components/Layout';
import Login from './components/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
import Signup from './components/Signup';
import { UserProvider } from './context/user-context';
import MystwrightGame from './components/Game';

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
                    <MystwrightGame />
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
