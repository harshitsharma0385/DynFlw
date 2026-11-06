
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config/api';

function ManagerLogin() {
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed.');
            }

            localStorage.setItem('managerToken', data.token);
            localStorage.setItem('managerUsername', data.manager.username);

            navigate('/manager');

        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <h1 style={styles.logo}>DynFlw</h1>
                <p style={styles.tagline}>Dining, in Sync.</p>

                <h2 style={styles.heading}>Manager Login</h2>
                <p style={styles.subtitle}>
                    Sign in to manage your restaurant.
                </p>

                <form onSubmit={handleLogin}>
                    <label style={styles.label}>Username</label>
                    <input
                        style={styles.input}
                        type="text"
                        placeholder="Enter username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />

                    <label style={styles.label}>Password</label>
                    <input
                        style={styles.input}
                        type="password"
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    {error && (
                        <p style={styles.error}>{error}</p>
                    )}

                    <button
                        type="submit"
                        style={styles.button}
                        disabled={loading}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <p style={styles.footer}>Powered by DynFlw</p>
            </div>
        </div>
    );
}

const styles = {
    page: {
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#f4f5f7',
        padding: '20px'
    },
    card: {
        width: '100%',
        maxWidth: '400px',
        background: '#fff',
        padding: '40px',
        borderRadius: '14px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.08)'
    },
    logo: {
        textAlign: 'center',
        margin: 0,
        fontSize: '32px',
        fontWeight: '700'
    },
    tagline: {
        textAlign: 'center',
        color: '#777',
        marginTop: '5px',
        marginBottom: '35px'
    },
    heading: {
        marginBottom: '8px',
        fontSize: '24px'
    },
    subtitle: {
        color: '#777',
        marginBottom: '25px'
    },
    label: {
        display: 'block',
        marginBottom: '8px',
        fontWeight: '600'
    },
    input: {
        width: '100%',
        padding: '12px',
        marginBottom: '20px',
        border: '1px solid #ddd',
        borderRadius: '7px',
        boxSizing: 'border-box',
        fontSize: '15px'
    },
    button: {
        width: '100%',
        padding: '13px',
        background: '#171717',
        color: '#fff',
        border: 'none',
        borderRadius: '7px',
        fontSize: '16px',
        cursor: 'pointer'
    },
    error: {
        color: '#d32f2f',
        fontSize: '14px',
        marginBottom: '15px'
    },
    footer: {
        textAlign: 'center',
        color: '#999',
        fontSize: '12px',
        marginTop: '30px'
    }
};

export default ManagerLogin;
