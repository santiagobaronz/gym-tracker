'use client'

import { useState, useEffect } from 'react';

// Hook personalizado para manejar el almacenamiento local
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // Estado para almacenar nuestro valor
  // Pasa la función de inicialización a useState para que la lógica se ejecute solo una vez
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      // Obtener del almacenamiento local por clave
      const item = window.localStorage.getItem(key);
      // Analizar el JSON almacenado o devolver el valor inicial
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // Si hay un error, devolver el valor inicial
      console.error(`Error al leer ${key} de localStorage:`, error);
      return initialValue;
    }
  });

  // Función para actualizar el valor en localStorage y estado
  const setValue = (value: T) => {
    try {
      // Permitir que el valor sea una función para tener la misma API que useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      // Guardar en el estado
      setStoredValue(valueToStore);
      // Guardar en localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      // En caso de error, registrar en consola
      console.error(`Error al guardar ${key} en localStorage:`, error);
    }
  };

  // Efecto para sincronizar con otros tabs/ventanas
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        setStoredValue(JSON.parse(e.newValue));
      }
    };
    
    // Escuchar cambios en localStorage
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      return () => {
        window.removeEventListener('storage', handleStorageChange);
      };
    }
  }, [key]);

  return [storedValue, setValue];
}
