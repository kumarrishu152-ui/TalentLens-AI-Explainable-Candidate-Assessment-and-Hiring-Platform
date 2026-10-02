import { useEffect, useState } from 'react';

const STORAGE_KEY = 'talentlens-theme';

export const useTheme = () => {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem(STORAGE_KEY) === 'dark');

  useEffect(() => {
    const theme = darkMode ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [darkMode]);

  return [darkMode, setDarkMode];
};
