import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';

export default function NavbarBottom() {
  const pathname = usePathname();
  const { user } = useUser();
  
  // Si no hay usuario seleccionado, no mostrar la barra de navegación
  if (!user) return null;
  
  // Rutas para la navegación
  const navItems = [
    {
      name: 'Inicio',
      path: `/${user.id}`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'Sesiones',
      path: `/${user.id}/sesiones`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      name: 'Resumen',
      path: `/${user.id}/resumen/semanal`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      name: 'Objetivos',
      path: `/${user.id}/objetivos`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 pb-3 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-10">
      <div className="container-mobile">
        <div className="flex justify-between items-center h-16">
          {navItems.map((item) => {
            // Corregir la lógica para determinar si una ruta está activa
            let isActive = false;
            
            if (item.path === `/${user.id}`) {
              // Para la página de inicio, solo es activa si es exactamente esa ruta
              isActive = pathname === item.path;
            } else if (item.path.includes('/resumen/')) {
              // Para resumen, es activa si cualquier página de resumen está activa
              isActive = pathname.includes(`/${user.id}/resumen/`);
            } else {
              // Para otras páginas, es activa si la ruta comienza con ese path
              isActive = pathname.startsWith(item.path);
            }
            
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`flex flex-col items-center justify-center flex-1 py-2 ${
                  isActive 
                    ? 'text-primary dark:text-primary-light' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary-light'
                }`}
              >
                {item.icon}
                <span className="text-xs mt-1">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
