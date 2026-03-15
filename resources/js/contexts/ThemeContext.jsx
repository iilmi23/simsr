// resources/js/contexts/ThemeContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    // State untuk theme: 'light' atau 'dark'
    const [theme, setTheme] = useState(() => {
        // Cek localStorage dulu
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || savedTheme === 'light') {
            return savedTheme;
        }
        // Kalau tidak ada, default ke 'light'
        return 'light';
    });

    // Efek untuk mengupdate class di HTML dan localStorage
    useEffect(() => {
        const root = document.documentElement;
        
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        
        localStorage.setItem('theme', theme);
        
        // Debug: lihat di console
        console.log('Theme changed to:', theme);
        console.log('HTML class:', root.classList);
    }, [theme]);

    // Fungsi untuk toggle theme
    const toggleTheme = () => {
        setTheme(prevTheme => {
            const newTheme = prevTheme === 'light' ? 'dark' : 'light';
            console.log('Toggling theme to:', newTheme); // Debug
            return newTheme;
        });
    };

    // Fungsi untuk set theme tertentu
    const setLightMode = () => setTheme('light');
    const setDarkMode = () => setTheme('dark');

    return (
        <ThemeContext.Provider value={{ 
            theme, 
            toggleTheme, 
            setLightMode, 
            setDarkMode,
            isDarkMode: theme === 'dark',
            isLightMode: theme === 'light'
        }}>
            {children}
        </ThemeContext.Provider>
    );
};