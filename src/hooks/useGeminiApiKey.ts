
'use client';

import { useState, useEffect } from 'react';

const API_KEY_STORAGE_KEY = 'followups-gemini-api-key';

export function useGeminiApiKey() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
      if (storedApiKey) {
        setApiKey(storedApiKey);
      }
    } catch (error) {
      console.error("Could not access localStorage:", error);
    }
    setIsLoaded(true);
  }, []);

  const saveApiKey = (key: string | null) => {
    try {
      if (key) {
        localStorage.setItem(API_KEY_STORAGE_KEY, key);
      } else {
        localStorage.removeItem(API_KEY_STORAGE_KEY);
      }
      setApiKey(key);
    } catch (error) {
      console.error("Could not access localStorage to save API key:", error);
    }
  };

  return { apiKey, setApiKey: saveApiKey, isLoaded };
}
