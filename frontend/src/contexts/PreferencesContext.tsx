import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';

interface Preferences {
    theme: string;
    language: string;
    timezone: string;
    dateFormat: string;
    currency: string;
}

interface PreferencesContextType {
    preferences: Preferences;
    formatDate: (date: Date | string | null | undefined) => string;
    currencySymbol: string;
}

const defaultPreferences: Preferences = {
    theme: 'system',
    language: 'en-IN',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    currency: 'INR',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
    AED: 'د.إ',
};

const PreferencesContext = createContext<PreferencesContextType>({
    preferences: defaultPreferences,
    formatDate: () => '',
    currencySymbol: '₹',
});

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const { setTheme } = useTheme();
    const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);

    // Sync preferences from user data whenever user changes
    useEffect(() => {
        if (!user) return;

        const userPrefs: Preferences = {
            theme: user.preferences?.theme || defaultPreferences.theme,
            language: user.preferences?.language || defaultPreferences.language,
            timezone: user.preferences?.timezone || user.profile?.timezone || defaultPreferences.timezone,
            dateFormat: user.preferences?.dateFormat || defaultPreferences.dateFormat,
            currency: user.preferences?.currency || user.profile?.currency || defaultPreferences.currency,
        };

        setPreferences(userPrefs);

        // Sync theme to ThemeContext (and localStorage) if user has a preference set
        if (userPrefs.theme && userPrefs.theme !== 'system') {
            setTheme(userPrefs.theme as 'light' | 'dark' | 'system');
        }
    }, [user, setTheme]);

    // Format a date according to user's dateFormat preference
    const formatDate = (date: Date | string | null | undefined): string => {
        if (!date) return '';
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime())) return '';

        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();

        switch (preferences.dateFormat) {
            case 'MM/DD/YYYY': return `${month}/${day}/${year}`;
            case 'YYYY-MM-DD': return `${year}-${month}-${day}`;
            case 'DD/MM/YYYY':
            default: return `${day}/${month}/${year}`;
        }
    };

    const currencySymbol = CURRENCY_SYMBOLS[preferences.currency] || '₹';

    return (
        <PreferencesContext.Provider value={{ preferences, formatDate, currencySymbol }}>
            {children}
        </PreferencesContext.Provider>
    );
}

export const usePreferences = () => useContext(PreferencesContext);
