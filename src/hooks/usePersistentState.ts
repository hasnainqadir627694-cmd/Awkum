import { useState } from 'react';

/**
 * Custom hook that wraps useState with localStorage functionality
 * to simplify state persistence for UI components like modals and preferences.
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  // Initialize state from localStorage if available, otherwise use initialValue
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`[usePersistentState] Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Setter function that updates state and persists to localStorage
  const setPersistedState = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(state) : value;
      setState(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`[usePersistentState] Error setting localStorage key "${key}":`, error);
    }
  };

  return [state, setPersistedState];
}
