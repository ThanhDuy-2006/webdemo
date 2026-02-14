
import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const { user } = useAuth();
    const [theme, setTheme] = useState({
        primary: '#4f7cff',
        secondary: '#7c9dff',
        background: '#0b1020',
        text: '#e5e7eb'
    });

    // Load theme from user profile on login
    useEffect(() => {
        if (user?.theme_config) {
            try {
                const config = typeof user.theme_config === 'string' 
                    ? JSON.parse(user.theme_config) 
                    : user.theme_config;
                setTheme(prev => ({ ...prev, ...config }));
            } catch (e) {
                console.error("Failed to parse theme config", e);
            }
        }
    }, [user]);

    // Apply theme to CSS variables
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--primary-custom', theme.primary);
        root.style.setProperty('--secondary-custom', theme.secondary);
        // We might need to handle gradients or other complex values
        // root.style.setProperty('--bg-gradient', `linear-gradient(135deg, ${theme.background}, #111b3a)`); 
        // Simple background for now to avoid complexity
        root.style.setProperty('--bg-gradient', theme.background); 
        root.style.setProperty('--text-light', theme.text);
    }, [theme]);

    const saveTheme = async (newTheme) => {
        setTheme(newTheme);
        if (user) {
            try {
                await api.put('/users/theme', { theme_config: newTheme });
            } catch (e) {
                console.error("Failed to save theme", e);
            }
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, saveTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
