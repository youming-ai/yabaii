import React, { useState, useEffect } from 'react';
import { Button } from '@heroui/react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
    const [theme, setTheme] = useState('light');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const savedTheme = localStorage.getItem('theme');
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        const initialTheme = savedTheme || systemTheme;

        setTheme(initialTheme);
        applyTheme(initialTheme);
    }, []);

    const applyTheme = (newTheme) => {
        const root = document.documentElement;

        if (newTheme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        localStorage.setItem('theme', newTheme);
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        applyTheme(newTheme);
    };

    if (!mounted) {
        return (
            <Button isIconOnly variant="flat" className="w-10 h-10" isLoading />
        );
    }

    return (
        <Button
            isIconOnly
            variant="flat"
            onPress={toggleTheme}
            className="w-10 h-10"
            aria-label={theme === 'light' ? 'ダークモードに切り替え' : 'ライトモードに切り替え'}
        >
            {theme === 'light' ? (
                <Sun className="w-5 h-5 text-yellow-500" />
            ) : (
                <Moon className="w-5 h-5 text-indigo-400" />
            )}
        </Button>
    );
}
