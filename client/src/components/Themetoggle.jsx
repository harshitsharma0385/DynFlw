import { useEffect, useState } from 'react';

function getInitialTheme() {
    try {
        const saved = localStorage.getItem('theme');

        if (saved === 'light' || saved === 'dark') {
            return saved;
        }
    } catch (error) {
        // Storage can be unavailable (private mode); fall through to the device setting.
    }

    return window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark';
}

function ThemeToggle() {
    const [theme, setTheme] = useState(getInitialTheme);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);

        try {
            localStorage.setItem('theme', theme);
        } catch (error) {
            // Ignore: the choice just won't be remembered.
        }
    }, [theme]);

    const nextTheme = theme === 'dark' ? 'light' : 'dark';

    return (
        <button
            type="button"
            className="theme-toggle"
            onClick={() => setTheme(nextTheme)}
            aria-label={`Switch to ${nextTheme} mode`}
        >
            {theme === 'dark' ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
            ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                </svg>
            )}
            {nextTheme === 'light' ? 'Light' : 'Dark'}
        </button>
    );
}

export default ThemeToggle;