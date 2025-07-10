"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import NavbarBottom from "@/components/NavbarBottom";
import ThemeToggle from "@/components/ThemeToggle";
import toast from "react-hot-toast";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const { user, setUser } = useUser();
  const [loading, setLoading] = useState(true);

  // Cargar el usuario si no está en el contexto
  useEffect(() => {
    const fetchUser = async () => {
      if (!user || user.id !== params.userId) {
        try {
          const response = await fetch(`/api/users/${params.userId}`);
          
          if (!response.ok) {
            throw new Error('Error al cargar el usuario');
          }
          
          const userData = await response.json();
          setUser(userData);
        } catch (error) {
          console.error("Error al cargar el usuario:", error);
          toast.error("No se pudo cargar la información del usuario");
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, [params.userId, user, setUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="container-mobile py-3 flex justify-between items-center">
          <div className="flex items-center">
            {user && (
              <>
                <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                  <img
                    src={user.img}
                    alt={user.name}
                    width={40}
                    height={40}
                    className="object-cover"
                  />
                </div>
                <h1 className="text-lg font-semibold">{user.name}</h1>
              </>
            )}
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Contenido principal */}
      <main className="container-mobile py-4">{children}</main>

      {/* Barra de navegación inferior */}
      <NavbarBottom />
    </div>
  );
}
