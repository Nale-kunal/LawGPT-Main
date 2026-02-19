import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useRef, useState } from 'react';

export const ThemeToggle = () => {
    const { actualTheme, setThemeAndSave } = useTheme();
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [isAnimating, setIsAnimating] = useState(false);

    const handleToggle = async () => {
        if (isAnimating) return;

        const button = buttonRef.current;
        if (!button) return;

        const newTheme = actualTheme === 'dark' ? 'light' : 'dark';

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReducedMotion) {
            await setThemeAndSave(newTheme);
            return;
        }

        const rect = button.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        // Use View Transitions API if available (Chrome 111+)
        // This captures a real screenshot and clips between old/new state
        if ('startViewTransition' in document) {
            setIsAnimating(true);

            // Set CSS custom properties for clip-path origin
            document.documentElement.style.setProperty('--theme-toggle-x', `${x}px`);
            document.documentElement.style.setProperty('--theme-toggle-y', `${y}px`);

            // Add direction class so CSS knows which way to animate
            document.documentElement.dataset.themeTransition = newTheme === 'dark' ? 'to-dark' : 'to-light';

            // @ts-ignore — TS may not have this type yet
            const transition = document.startViewTransition(async () => {
                await setThemeAndSave(newTheme);
            });

            transition.finished.finally(() => {
                delete document.documentElement.dataset.themeTransition;
                setIsAnimating(false);
            });

            return;
        }

        // Fallback: solid overlay animation for older browsers
        setIsAnimating(true);

        // Use a typed reference to avoid TS narrowing `document` to `never`
        const doc = document as Document & { body: HTMLElement };
        const snapshot = doc.createElement('div');
        snapshot.className = 'theme-transition-overlay';
        snapshot.style.background = newTheme === 'dark' ? 'hsl(220 15% 8%)' : 'hsl(0 0% 100%)';

        doc.documentElement.style.setProperty('--theme-toggle-x', `${x}px`);
        doc.documentElement.style.setProperty('--theme-toggle-y', `${y}px`);

        doc.body.appendChild(snapshot);

        if (newTheme === 'light') {
            await setThemeAndSave(newTheme);
        }

        snapshot.classList.add(newTheme === 'dark' ? 'expanding' : 'contracting');

        setTimeout(async () => {
            if (newTheme === 'dark') {
                await setThemeAndSave(newTheme);
            }
            snapshot.remove();
            setIsAnimating(false);
        }, 300);
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
