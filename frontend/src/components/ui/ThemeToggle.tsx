import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useRef, useState } from 'react';

export const ThemeToggle = () => {
    const { theme, actualTheme, triggerThemeChange } = useTheme();
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [isAnimating, setIsAnimating] = useState(false);

    const handleToggle = async () => {
        if (isAnimating) return;

        const button = buttonRef.current;
        if (!button) return;

        const rect = button.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReducedMotion) {
            triggerThemeChange();
            return;
        }

        setIsAnimating(true);

        // Determine current and new theme
        const currentTheme = actualTheme;
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        // Create snapshot overlay
        const snapshot = document.createElement('div');
        snapshot.className = 'theme-transition-overlay';

        // Set overlay color based on animation type:
        // - EXPANDING (to dark): Show NEW dark theme expanding
        // - CONTRACTING (to light): Show OLD dark theme contracting
        if (newTheme === 'dark') {
            // Going to dark: overlay shows NEW dark theme
            snapshot.style.background = 'hsl(220 15% 8%)';
        } else {
            // Going to light: overlay shows OLD dark theme
            snapshot.style.background = 'hsl(220 15% 8%)';
        }

        // Set animation origin
        document.documentElement.style.setProperty('--theme-toggle-x', `${x}px`);
        document.documentElement.style.setProperty('--theme-toggle-y', `${y}px`);

        // Add snapshot to DOM
        document.body.appendChild(snapshot);

        // Timing strategy:
        // - CONTRACTING (to light): Change theme immediately, overlay hides it
        // - EXPANDING (to dark): DON'T change yet, overlay reveals it
        if (newTheme === 'light') {
            triggerThemeChange();
        }

        // Choose animation
        if (newTheme === 'dark') {
            snapshot.classList.add('expanding');
        } else {
            snapshot.classList.add('contracting');
        }

        // Remove snapshot after animation completes
        setTimeout(() => {
            // For EXPANDING: change theme at the end
            if (newTheme === 'dark') {
                triggerThemeChange();
            }

            snapshot.remove();
            setIsAnimating(false);
        }, 175); // Doubled speed (was 350ms)
    };

    return (
        <button
            ref={buttonRef}
            onClick={handleToggle}
            disabled={isAnimating}
            className="relative h-9 w-9 rounded-full border border-border bg-card hover:bg-accent/10 hover:border-accent hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Switch to ${actualTheme === 'dark' ? 'light' : 'dark'} mode`}
        >
            {actualTheme === 'dark' ? (
                <Sun className="h-4 w-4 text-foreground transition-transform duration-200" />
            ) : (
                <Moon className="h-4 w-4 text-foreground transition-transform duration-200" />
            )}
        </button>
    );
};
