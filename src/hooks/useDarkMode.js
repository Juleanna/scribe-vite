import { useState, useEffect } from 'react';

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('scribe_dark_mode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('scribe_dark_mode', dark);
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return [dark, setDark];
}
