import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { ACCENT_THEMES } from '../lib/constants';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const { user } = useAuth();
  
  // State
  const [accentColor, setAccentColor] = useState('blue');
  const [themeMode, setThemeMode] = useState('dark');
  const [defaultView, setDefaultView] = useState('graph'); // NEW: Default View State
  const [tags, setTags] = useState([]);

  // 1. Sync with Firebase Settings
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'artifacts', 'default-app-id', 'users', user.uid, 'settings', 'tags'), (docSnap) => {
        if(docSnap.exists()) {
            const data = docSnap.data();
            if (data.theme) setAccentColor(data.theme);
            if (data.mode) setThemeMode(data.mode);
            if (data.defaultView) setDefaultView(data.defaultView); // NEW: Sync from DB
            if (data.list) setTags(data.list);
        }
    });
    return () => unsub();
  }, [user]);

  // 2. Apply Theme to HTML Body
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    root.classList.remove('dark');
    body.classList.remove('bg-zinc-50', 'bg-zinc-100', 'bg-zinc-900', 'bg-black', 'text-zinc-900', 'text-white');

    if (themeMode === 'light') {
        body.classList.add('bg-zinc-100', 'text-zinc-900');
    } 
    else if (themeMode === 'dark') {
        root.classList.add('dark');
        body.classList.add('bg-zinc-900', 'text-white');
    } 
    else if (themeMode === 'amoled') {
        root.classList.add('dark');
        body.classList.add('bg-black', 'text-white');
    }
  }, [themeMode]);

  const updateSettings = async (key, value) => {
      // Optimistic updates
      if (key === 'theme') setAccentColor(value);
      if (key === 'mode') setThemeMode(value);
      if (key === 'defaultView') setDefaultView(value); // NEW: Optimistic update
      
      if (user) {
          await setDoc(doc(db, 'artifacts', 'default-app-id', 'users', user.uid, 'settings', 'tags'), { 
              [key]: value 
          }, { merge: true });
      }
  };

  const updateTags = async (newTags) => {
      setTags(newTags);
      if (user) {
          await setDoc(doc(db, 'artifacts', 'default-app-id', 'users', user.uid, 'settings', 'tags'), { 
              list: newTags 
          }, { merge: true });
      }
  };

  const setThemeModeWrapper = (mode) => updateSettings('mode', mode);

  const theme = ACCENT_THEMES[accentColor] || ACCENT_THEMES.blue;
  const isAmoled = themeMode === 'amoled';

  return (
    <ThemeContext.Provider value={{ 
        theme, 
        accentColor, 
        themeMode,
        defaultView, // NEW: Exported
        setThemeMode: setThemeModeWrapper,
        isAmoled, 
        tags, 
        updateSettings, 
        updateTags 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);