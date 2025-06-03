import React, { createContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(Appearance.getColorScheme() === 'dark');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('themePreference');
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === 'dark');
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      }
    };
    loadTheme();
  }, []);

  useEffect(() => {
    const saveTheme = async () => {
      try {
        await AsyncStorage.setItem('themePreference', isDarkMode ? 'dark' : 'light');
      } catch (error) {
        console.error('Error saving theme preference:', error);
      }
    };
    saveTheme();
  }, [isDarkMode]);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (!AsyncStorage.getItem('themePreference')) {
        setIsDarkMode(colorScheme === 'dark');
      }
    });
    return () => subscription.remove();
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const theme = useMemo(
    () => ({
      isDarkMode,
      toggleTheme,
      colors: {
        background: isDarkMode ? '#121212' : '#F1F9FE',
        card: isDarkMode ? '#1E1E1E' : '#E7ECF2',
        text: isDarkMode ? '#FFFFFF' : '#000000',
        border: isDarkMode ? '#444444' : '#DDDDDD',
        primary: isDarkMode ? '#00B7EB' : '#3465D6',
        accent: isDarkMode ? '#FFD700' : '#FDD600',
      },
    }),
    [isDarkMode]
  );

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => React.useContext(ThemeContext);