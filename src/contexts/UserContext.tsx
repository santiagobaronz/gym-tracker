'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useRouter, usePathname } from 'next/navigation';

// Definición del tipo de usuario
export interface User {
  id: string;
  name: string;
  img: string;
}

// Tipo para el contexto de usuario
type UserContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
};

// Crear el contexto
const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  // Usar el hook personalizado para persistir el usuario en localStorage
  const [user, setUser] = useLocalStorage<User | null>('trackgym-user', null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Efecto para verificar si hay un usuario seleccionado
  useEffect(() => {
    // Solo redirigir si estamos en el cliente
    if (typeof window !== 'undefined') {
      setIsLoading(false);
      
      // Si no hay usuario seleccionado y no estamos en la página principal,
      // redirigir a la página de selección de usuario
      if (!user && pathname !== '/') {
        router.push('/');
      }
      
      // Si hay un usuario seleccionado y estamos en la página principal,
      // redirigir al dashboard del usuario
      if (user && pathname === '/') {
        router.push(`/${user.id}`);
      }
    }
  }, [user, router, pathname]);

  return (
    <UserContext.Provider value={{ user, setUser, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

// Hook personalizado para usar el contexto del usuario
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser debe ser usado dentro de un UserProvider');
  }
  return context;
}
