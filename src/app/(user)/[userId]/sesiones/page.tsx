"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { Session, SessionExercise } from "@/types";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import toast from "react-hot-toast";

export default function SessionsPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // Cargar sesiones del usuario
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch(`/api/sesiones?userId=${userId}`);
        
        if (!response.ok) {
          throw new Error('Error al cargar sesiones');
        }
        
        const data = await response.json();
        setSessions(data);
        setIsLoading(false);
      } catch (error) {
        console.error("Error al cargar sesiones:", error);
        toast.error("Error al cargar el historial de sesiones");
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, [userId]);

  // Manejar la eliminación de una sesión
  const handleDeleteSession = async (sessionId: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta sesión? Esta acción no se puede deshacer.")) {
      try {
        const response = await fetch(`/api/sesiones/${sessionId}`, {
          method: "DELETE",
        });
        
        if (!response.ok) {
          throw new Error('Error al eliminar la sesión');
        }
        
        // Eliminar la sesión de la lista
        setSessions(sessions.filter(session => session.id !== sessionId));
        toast.success("Sesión eliminada correctamente");
      } catch (error) {
        console.error("Error al eliminar la sesión:", error);
        toast.error("Error al eliminar la sesión");
      }
    }
  };

  // Agrupar sesiones por mes
  const groupedSessions = sessions.reduce((groups: Record<string, Session[]>, session) => {
    const date = new Date(session.date);
    const monthYear = format(date, "MMMM yyyy", { locale: es });
    
    if (!groups[monthYear]) {
      groups[monthYear] = [];
    }
    
    groups[monthYear].push(session);
    return groups;
  }, {});

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Historial de sesiones</h1>
        <button
          onClick={() => router.push(`/${userId}/sesiones/new`)}
          className="btn btn-primary flex items-center"
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
          Nueva
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : sessions.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedSessions).map(([monthYear, monthlySessions]) => (
            <div key={monthYear}>
              <h2 className="text-lg font-medium mb-3 capitalize">{monthYear}</h2>
              
              <div className="space-y-3">
                {monthlySessions.map((session) => (
                  <div key={session.id} className="card">
                    {/* Cabecera de la sesión (siempre visible) */}
                    <div 
                      className="flex justify-between items-start cursor-pointer"
                      onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                    >
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
                          className={`h-5 w-5 transition-transform ${
                            expandedSession === session.id ? "transform rotate-90" : ""
                          }`}
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

                    {/* Detalles de la sesión (expandible) */}
                    {expandedSession === session.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        {/* Lista de ejercicios */}
                        <div className="mb-4">
                          <h4 className="text-sm font-medium mb-2">Ejercicios</h4>
                          <ul className="space-y-2">
                            {session.exercises?.map((exercise: SessionExercise) => (
                              <li key={exercise.id} className="text-sm">
                                <div className="flex justify-between">
                                  <span className="font-medium">{exercise.exercise?.name}</span>
                                  <span className="text-gray-500 dark:text-gray-400">
                                    {exercise.sets} × {exercise.reps} × {exercise.weightKg} kg
                                  </span>
                                </div>
                                {exercise.exercise?.category && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {exercise.exercise.category}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Notas */}
                        {session.notes && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-1">Notas</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{session.notes}</p>
                          </div>
                        )}

                        {/* Acciones */}
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/${userId}/sesiones/${session.id}/edit`);
                            }}
                            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSession(session.id);
                            }}
                            className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-md transition-colors"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-8">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No tienes sesiones registradas
          </p>
          <button
            onClick={() => router.push(`/${userId}/sesiones/new`)}
            className="btn btn-primary"
          >
            Registrar primera sesión
          </button>
        </div>
      )}
    </div>
  );
}
