import { useCallback, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useUserContext } from "../context/user-context";
import "../styles/Auth.css";
import { login } from "../utils/auth";
import Page from "./Page";
import Logo from '/icon.png';

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const location = useLocation();
    const { setTokenSet, setUser } = useUserContext();

    // Get the intended destination from location state, default to /app
    const from = (location.state as any)?.from || '/app';

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const result = await login(email, password);
        
        if ('error' in result) {
            setError(result.error);
            setLoading(false);
        } else {
            // Update the authentication state
            setTokenSet(result.tokenSet);
            setUser(result.user);
            
            // Use a small delay to ensure React state has updated
            // and then navigate using window.location for more reliable redirect
            setTimeout(() => {
                setLoading(false);
                // Force navigation by replacing the current history entry
                window.location.replace(from);
            }, 200);
        }
    }, [email, password, setTokenSet, setUser, from]);

    return (
        <Page padding={20}>
            <div className="auth-container">
                <div className="auth-icon">
                    <img src={Logo} alt="Mystwright Logo" />
                </div>
                <div className="auth-content">
                    <div className="auth-title">Welcome Back</div>
                    <div className="auth-subtitle">Sign in to continue your mysteries</div>
                    
                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
                        
                        {error && <div className="auth-error">{error}</div>}
                        
                        <button type="submit" className="auth-button" disabled={loading}>
                            {loading ? "Signing In..." : "Sign In"}
                        </button>
                    </form>
                    
                    <div className="auth-link">
                        Don't have an account? <Link to="/signup">Sign up</Link>
                    </div>
                </div>
            </div>
        </Page>
    );
}
