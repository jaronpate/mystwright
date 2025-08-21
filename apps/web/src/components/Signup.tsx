import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useUserContext } from "../context/user-context";
import { signup } from "../utils/auth";
import Page from "./Page";
import "../styles/Auth.css";
import Logo from '/icon.png';

export default function Signup() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { setTokenSet, setUser } = useUserContext();

    // Get the intended destination from location state, default to /app
    const from = (location.state as any)?.from || '/app';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const result = await signup(email, password, firstName, lastName);
        
        if ('error' in result) {
            setError(result.error);
        } else {
            setTokenSet(result.tokenSet);
            setUser(result.user);
            // Redirect to the intended destination or /app by default
            navigate(from, { replace: true });
        }
        
        setLoading(false);
    };

    return (
        <Page padding={20}>
            <div className="auth-container">
                <div className="auth-icon">
                    <img src={Logo} alt="Mystwright Logo" />
                </div>
                <div className="auth-content">
                    <div className="auth-title">Join Mystwright</div>
                    <div className="auth-subtitle">Create your account to start solving mysteries</div>
                    
                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-group">
                            <label htmlFor="firstName">First Name</label>
                            <input
                                type="text"
                                id="firstName"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="lastName">Last Name (Optional)</label>
                            <input
                                type="text"
                                id="lastName"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        
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
                            {loading ? "Creating Account..." : "Sign Up"}
                        </button>
                    </form>
                    
                    <div className="auth-link">
                        Already have an account? <Link to="/login">Sign in</Link>
                    </div>
                </div>
            </div>
        </Page>
    );
}
