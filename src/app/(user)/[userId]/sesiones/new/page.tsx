"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import SessionForm from "@/components/SessionForm";
import toast from "react-hot-toast";
import { SessionFormData } from "@/types";

export default function NewSessionPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manejar el envío del formulario
  const handleSubmit = async (data: SessionFormData) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch("/api/sesiones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          userId,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al registrar la sesión");
      }
      
      const sessionData = await response.json();
      
      // Mostrar mensaje de éxito
      toast.success("Sesión registrada correctamente");
      
      // Redirigir al historial de sesiones
      router.push(`/${userId}/sesiones`);
    } catch (error) {
      console.error("Error al registrar la sesión:", error);
      toast.error(error instanceof Error ? error.message : "Error al registrar la sesión");
      setIsSubmitting(false);
    }
  };

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

      <h1 className="text-2xl font-bold mb-6">Registrar nueva sesión</h1>

      <SessionForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}
