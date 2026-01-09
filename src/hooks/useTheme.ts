import { useAppStore } from '@/lib/store';
import { useEffect } from 'react';

export const useTheme = () => {
  const { settings, updateTheme } = useAppStore();

  useEffect(() => {
    const html = document.documentElement;
    if (settings.theme === 'dark') {
      html.classList. add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [settings.theme]);

  const toggleTheme = () => {
    updateTheme(settings. theme === 'light' ? 'dark' : 'light');
  };

  return {
    theme: settings.theme,
    toggleTheme,
  };
};