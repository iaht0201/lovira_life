import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AccessibilitySettings } from '../types';
import { storageService } from '../services/storageService';

interface AccessibilityContextType {
  accessibility: AccessibilitySettings;
  setAccessibility: React.Dispatch<React.SetStateAction<AccessibilitySettings>>;
  updateAccessibility: (key: keyof AccessibilitySettings, value: any) => void;
  fontScale: number;
  theme: 'light' | 'dark';
  highContrast: boolean;
  vslEnabled: boolean;
  speakResponse: boolean;
  reducedMotion: boolean;
}

const AccessibilityReactContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>(() =>
    storageService.getAccessibilitySettings()
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;

    const theme = accessibility.theme === 'dark' ? 'dark' : 'light';

    root.dataset.theme = theme;
    root.classList.toggle('dark', theme === 'dark');

    root.style.setProperty('--font-scale', accessibility.fontScale.toString());

    root.classList.toggle('high-contrast', Boolean(accessibility.highContrast));

    storageService.saveAccessibilitySettings({
      ...accessibility,
      theme,
    });

    if (process.env.NODE_ENV !== 'production') {
      console.debug('[Lovira Theme]', {
        stateTheme: theme,
        htmlDark: root.classList.contains('dark'),
        dataTheme: root.dataset.theme,
      });
    }
  }, [accessibility]);

  const updateAccessibility = (key: keyof AccessibilitySettings, value: any) => {
    setAccessibility((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <AccessibilityReactContext.Provider
      value={{
        accessibility,
        setAccessibility,
        updateAccessibility,
        fontScale: accessibility.fontScale,
        theme: accessibility.theme,
        highContrast: accessibility.highContrast,
        vslEnabled: accessibility.vslEnabled,
        speakResponse: accessibility.speakResponse,
        reducedMotion: accessibility.reducedMotion,
      }}
    >
      {children}
    </AccessibilityReactContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityReactContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
