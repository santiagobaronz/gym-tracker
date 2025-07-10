"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import ThemeToggle from "@/components/ThemeToggle";

interface User {
  id: string;
  name: string;
  img: string;
}

export default function Home() {
  const { setUser } = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");

  // Cargar usuarios desde la base de datos
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        
        if (!response.ok) {
          throw new Error('Error al cargar usuarios');
        }
        
        const data: User[] = await response.json();
        setUsers(data);
        setIsLoading(false);
      } catch (error) {
        console.error("Error al cargar usuarios:", error);
        setError("No se pudieron cargar los usuarios. Por favor, intenta de nuevo más tarde.");
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Manejar la selección de usuario
  const handleSelectUser = (user: User) => {
    setUser(user);
    router.push(`/${user.id}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header con logo y toggle de tema */}
      <header className="p-4 flex justify-between items-center">
        <div className="text-2xl font-bold">GymTracker</div>
        <ThemeToggle />
      </header>

      {/* Contenido principal */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <h1 className="text-2xl font-bold mb-8 text-center">
          ¿Quién está usando la app?
        </h1>

        {isLoading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-500">
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 btn btn-primary"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-mobile">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => handleSelectUser(user)}
                className="flex flex-col items-center p-6 bg-card-light dark:bg-card-dark rounded-xl shadow-md hover:shadow-lg transition-shadow"
              >
                <div className={`w-32 h-32 rounded-full overflow-hidden mb-4 border-2 ${user.name === "Vanessa" ? "border-yellow-500" : "border-green-500"}`}>
                  <img
                      src={user.img}
                      alt={user.name}
                      width={128}
                      height={128}
                      className="object-cover"
                  />
                </div>
                <h2 className="text-xl font-semibold">{user.name}</h2>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
