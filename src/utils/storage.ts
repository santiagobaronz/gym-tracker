/**
 * Utilidades para el manejo de almacenamiento local
 * Siguiendo el principio de responsabilidad única
 */

// Claves de almacenamiento
const STORAGE_KEYS = {
  USER: 'trackgym-user',
  THEME: 'dark-mode',
  LAST_VISIT: 'last-visit',
};

/**
 * Guarda un valor en el almacenamiento local
 * @param key Clave de almacenamiento
 * @param value Valor a guardar
 */
export function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    const serializedValue = JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
  } catch (error) {
    console.error(`Error al guardar en localStorage (${key}):`, error);
  }
}

/**
 * Obtiene un valor del almacenamiento local
 * @param key Clave de almacenamiento
 * @param defaultValue Valor por defecto si no existe
 */
export function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const serializedValue = localStorage.getItem(key);
    if (serializedValue === null) return defaultValue;
    return JSON.parse(serializedValue) as T;
  } catch (error) {
    console.error(`Error al leer de localStorage (${key}):`, error);
    return defaultValue;
  }
}

/**
 * Elimina un valor del almacenamiento local
 * @param key Clave de almacenamiento
 */
export function removeFromStorage(key: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error al eliminar de localStorage (${key}):`, error);
  }
}

/**
 * Guarda el usuario seleccionado
 * @param user Objeto de usuario
 */
export function saveUser(user: { id: string; name: string; img: string }): void {
  saveToStorage(STORAGE_KEYS.USER, user);
}

/**
 * Obtiene el usuario guardado
 */
export function getUser(): { id: string; name: string; img: string } | null {
  return getFromStorage<{ id: string; name: string; img: string } | null>(STORAGE_KEYS.USER, null);
}

/**
 * Guarda la preferencia de tema
 * @param isDarkMode Si el tema oscuro está activo
 */
export function saveThemePreference(isDarkMode: boolean): void {
  saveToStorage(STORAGE_KEYS.THEME, isDarkMode);
}

/**
 * Obtiene la preferencia de tema
 * @returns true si el tema oscuro está activo, false en caso contrario
 */
export function getThemePreference(): boolean {
  return getFromStorage<boolean>(STORAGE_KEYS.THEME, true); // Por defecto, tema oscuro
}

/**
 * Registra la última visita del usuario
 */
export function registerVisit(): void {
  saveToStorage(STORAGE_KEYS.LAST_VISIT, new Date().toISOString());
}

/**
 * Obtiene la fecha de la última visita
 */
export function getLastVisit(): Date | null {
  const lastVisit = getFromStorage<string | null>(STORAGE_KEYS.LAST_VISIT, null);
  return lastVisit ? new Date(lastVisit) : null;
}
