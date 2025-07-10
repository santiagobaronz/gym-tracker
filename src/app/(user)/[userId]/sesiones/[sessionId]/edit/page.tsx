"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import SessionForm from "@/components/SessionForm";
import toast from "react-hot-toast";
import { Session, SessionExercise, SessionFormData } from "@/types";

export default function EditSessionPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const sessionId = params.sessionId as string;
  const [session, setSession] = useState<Session & { exercises: SessionExercise[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar datos de la sesión
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/sesiones/${sessionId}`);
        
        if (!response.ok) {
          throw new Error('Error al cargar la sesión');
        }
        
        const data = await response.json();
        setSession(data);
        setIsLoading(false);
      } catch (error) {
        console.error("Error al cargar la sesión:", error);
        toast.error("Error al cargar los datos de la sesión");
        router.push(`/${userId}/sesiones`);
      }
    };

    fetchSession();
  }, [sessionId, userId, router]);

  // Manejar el envío del formulario
  const handleSubmit = async (data: SessionFormData) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/sesiones/${sessionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al actualizar la sesión");
      }
      
      const updatedSession = await response.json();
      
      // Mostrar mensaje de éxito
      toast.success("Sesión actualizada correctamente");
      
      // Redirigir al historial de sesiones
      router.push(`/${userId}/sesiones`);
    } catch (error) {
      console.error("Error al actualizar la sesión:", error);
      toast.error(error instanceof Error ? error.message : "Error al actualizar la sesión");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
      <div className="my-5">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-1"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          Volver
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-6">Editar sesión</h1>

      {session && (
        <SessionForm
          initialData={session}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
