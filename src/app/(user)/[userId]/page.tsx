"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import KpiCard from "@/components/KpiCard";
import { Session, WeeklySummary } from "@/types";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import toast from "react-hot-toast";

export default function UserDashboard() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const [isLoading, setIsLoading] = useState(true);
  const [weekSessions, setWeekSessions] = useState<Session[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  // Fechas para la semana actual
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Lunes
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Domingo
  const weekRange = `${format(weekStart, "d MMM", { locale: es })} - ${format(
    weekEnd,
    "d MMM",
    { locale: es }
  )}`;

  // Cargar datos de la semana actual
  useEffect(() => {
    // Evitar múltiples llamadas simultáneas
    if (fetchingRef.current) return;
    
    const fetchWeekData = async () => {
      // Marcar que estamos fetcheando para evitar múltiples llamadas
      fetchingRef.current = true;
      setIsLoading(true);
      
      try {
        // Obtener sesiones de la semana actual
        const sessionsResponse = await fetch(
          `/api/sesiones?userId=${userId}&startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`
        );
        
        if (!sessionsResponse.ok) {
          throw new Error('Error al cargar sesiones');
        }
        
        const sessionsData = await sessionsResponse.json();
        
        // Obtener o generar el resumen semanal
        const summaryResponse = await fetch(
          `/api/resumen/generate?userId=${userId}&weekStart=${weekStart.toISOString()}`
        );
        
        if (!summaryResponse.ok) {
          throw new Error('Error al cargar el resumen semanal');
        }
        
        const summaryData = await summaryResponse.json();
        
        setWeekSessions(sessionsData);
        setWeeklySummary(summaryData.summary);
        setError(null);
      } catch (error) {
        console.error("Error al cargar datos de la semana:", error);
        setError("Error al cargar los datos. Intenta de nuevo más tarde.");
        toast.error("Error al cargar los datos. Intenta de nuevo más tarde.");
      } finally {
        setIsLoading(false);
        fetchingRef.current = false;
      }
    };

    fetchWeekData();
    
    // Dependencias explícitas y estables
  }, [userId, weekStart.toISOString(), weekEnd.toISOString()]);

  // Navegar a la página de nueva sesión
  const handleNewSession = () => {
    router.push(`/${userId}/sesiones/new`);
  };

  return (
    <div className="py-5">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button
          onClick={handleNewSession}
          className="btn btn-primary flex items-center py-1 text-md"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-1"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          Nueva sesión
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-medium mb-2">Semana actual: {weekRange}</h2>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="card text-center py-6">
            <p className="text-red-500 mb-2">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="btn btn-primary"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <KpiCard
              title="Sesiones"
              value={weeklySummary?.sessions || 0}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
              }
            />
            
            <KpiCard
              title="Tiempo total"
              value={`${weeklySummary?.totalMin || 0} min`}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
              }
            />
            
            <KpiCard
              title="Ejercicios"
              value={weeklySummary?.totalExercises || 0}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z"
                    clipRule="evenodd"
                  />
                </svg>
              }
            />
            
            <KpiCard
              title="Promedio"
              value={`${
                weeklySummary && weeklySummary.sessions > 0
                  ? Math.round(weeklySummary.totalMin / weeklySummary.sessions)
                  : 0
              } min/sesión`}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              }
            />
          </div>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-medium mb-2">Últimas sesiones</h2>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : weekSessions.length > 0 ? (
          <div className="space-y-3">
            {weekSessions.slice(0, 3).map((session) => (
              <div
                key={session.id}
                className="card cursor-pointer"
                onClick={() => router.push(`/${userId}/sesiones/${session.id}/edit`)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">
                      {format(new Date(session.date), "EEEE d 'de' MMMM", { locale: es })
                          .replace(/^./, (c) => c.toUpperCase())}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {session.durationMin} minutos • {(session.exercises?.length ?? 0)} ejercicios
                    </p>
                  </div>
                  <div className="text-primary dark:text-primary-light">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
            
            {weekSessions.length > 3 && (
              <button
                className="w-full text-center py-2 text-primary dark:text-primary-light"
                onClick={() => router.push(`/${userId}/sesiones`)}
              >
                Ver todas las sesiones
              </button>
            )}
          </div>
        ) : (
          <div className="card text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No tienes sesiones registradas esta semana
            </p>
            <button onClick={handleNewSession} className="btn btn-primary">
              Registrar primera sesión
            </button>
          </div>
        )}
      </div>

      <div>
        <button
          onClick={() => router.push(`/${userId}/resumen-compartido/semanal`)}
          className="w-full py-3 text-center bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors mb-3"
        >
          Ver resumen compartido
        </button>
        
        <button
          onClick={() => router.push(`/${userId}/resumen/semanal`)}
          className="w-full py-3 text-center bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          Ver resumen completo
        </button>
      </div>
    </div>
  );
}
