"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { format, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import KpiCard from "@/components/KpiCard";
import { WeeklySummary, WeightEntry } from "@/types";
import toast from "react-hot-toast";

export default function WeeklySummaryPage() {
  const params = useParams();
  const userId = params.userId as string;
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0); // 0 = semana actual, 1 = semana anterior, etc.
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [newWeight, setNewWeight] = useState<string>("");
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [topExercises, setTopExercises] = useState<{name: string, count: number}[]>([]);
  const [weightProjection, setWeightProjection] = useState<number | undefined>(undefined);
  const fetchingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  // Calcular fechas para la semana seleccionada
  const today = new Date();
  const selectedWeekDate = subWeeks(today, selectedWeekOffset);
  const weekStart = startOfWeek(selectedWeekDate, { weekStartsOn: 1 }); // Lunes
  const weekEnd = endOfWeek(selectedWeekDate, { weekStartsOn: 1 }); // Domingo
  
  // Memoizar los valores de fecha para evitar re-renderizados
  const weekStartString = weekStart.toISOString();
  const weekEndString = weekEnd.toISOString();
  
  const weekRange = `${format(weekStart, "d MMM", { locale: es })} - ${format(
    weekEnd,
    "d MMM",
    { locale: es }
  )}`;
  const isCurrentWeek = selectedWeekOffset === 0;

  // Cargar datos del resumen semanal
  useEffect(() => {
    // Evitar múltiples llamadas simultáneas
    if (fetchingRef.current) return;
    
    const fetchWeeklySummary = async () => {
      fetchingRef.current = true;
      setIsLoading(true);
      setError(null);
      
      try {
        // Obtener resumen semanal
        const response = await fetch(
          `/api/resumen/generate?userId=${userId}&weekStart=${weekStartString}`
        );
        
        if (!response.ok) {
          throw new Error('Error al cargar el resumen semanal');
        }
        
        const data = await response.json();
        
        // Obtener entradas de peso
        const weightResponse = await fetch(`/api/peso?userId=${userId}`);
        
        if (!weightResponse.ok) {
          throw new Error('Error al cargar los datos de peso');
        }
        
        const weightData = await weightResponse.json();
        
        setSummary(data.summary);
        setWeightEntries(weightData);
        setTopExercises(data.topExercises || []);
        setWeightProjection(data.weightProjection);
        
        // Verificar si ya existe un registro de peso para la semana actual
        const currentWeekWeight = weightData.find(
          (entry: WeightEntry) => format(new Date(entry.weekStart), "yyyy-MM-dd") === format(weekStart, "yyyy-MM-dd")
        );
        
        setCurrentWeight(currentWeekWeight?.weightKg || null);
        
        // Mostrar automáticamente el formulario si no hay peso registrado y es la semana actual
        if (!currentWeekWeight?.weightKg) {
          setShowWeightForm(true);
        } else {
          setShowWeightForm(false);
        }
      } catch (error) {
        console.error("Error al cargar el resumen semanal:", error);
        setError("Error al cargar los datos. Intenta de nuevo más tarde.");
        toast.error("Error al cargar los datos. Intenta de nuevo más tarde.");
      } finally {
        setIsLoading(false);
        fetchingRef.current = false;
      }
    };

    fetchWeeklySummary();
    
    // Dependencias estables
  }, [userId, selectedWeekOffset, weekStartString]);

  // Manejar el registro de peso
  const handleWeightSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newWeight.trim()) return;
    
    const weightValue = parseFloat(newWeight);
    
    if (isNaN(weightValue) || weightValue <= 0) {
      toast.error("Por favor, introduce un peso válido");
      return;
    }
    
    try {
      const response = await fetch("/api/peso", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          weekStart: weekStartString,
          weightKg: weightValue,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Error al registrar el peso");
      }
      
      const data = await response.json();
      
      setCurrentWeight(data.weightKg);
      setNewWeight("");
      setShowWeightForm(false);
      toast.success("Peso registrado correctamente");
    } catch (error) {
      console.error("Error al registrar peso:", error);
      toast.error("Error al registrar peso");
    }
  };

  // Navegar a la semana anterior
  const handlePreviousWeek = () => {
    setSelectedWeekOffset(selectedWeekOffset + 1);
  };

  // Navegar a la semana siguiente (solo si no es la semana actual)
  const handleNextWeek = () => {
    if (selectedWeekOffset > 0) {
      setSelectedWeekOffset(selectedWeekOffset - 1);
    }
  };

  return (
      <div className="my-5">
      <h1 className="text-2xl font-bold mb-6">Resumen Semanal</h1>
      
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={handlePreviousWeek}
          className="btn btn-icon"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>

        <h2 className="text-lg font-medium text-center">
          <div>Semana del {format(weekStart, "d 'de' MMMM", { locale: es })}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{weekRange}</div>
        </h2>

        <button
          onClick={handleNextWeek}
          className={`btn btn-icon ${isCurrentWeek ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isCurrentWeek}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

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
      ) : !summary || (summary.sessions === 0 && summary.totalExercises === 0 && summary.totalMin === 0) ? (
        <div className="card text-center py-8">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No hay registros en esta semana
          </p>
          {isCurrentWeek && (
            <button 
              onClick={() => window.location.href=`/${userId}/sesiones/new`} 
              className="btn btn-primary"
            >
              Registrar primera sesión
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Tarjetas de KPI */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <KpiCard
              title="Sesiones"
              value={summary?.sessions || 0}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              }
            />
            
            <KpiCard
              title="Horas"
              value={summary ? Math.round(summary.totalMin / 60 * 10) / 10 : 0}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              }
            />
            
            <KpiCard
              title="Ejercicios"
              value={summary?.totalExercises || 0}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clipRule="evenodd" />
                </svg>
              }
            />
            
            <KpiCard
              title="Peso"
              value={currentWeight ? `${currentWeight} kg` : "Pendiente"}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                </svg>
              }
              />
          </div>
          
          {/* Formulario de registro de peso - mostrado automáticamente si no hay peso registrado */}
          {!currentWeight && (
            <div className="card bg-gray-50 dark:bg-gray-800 p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-medium">Registrar peso semanal</h3>
              </div>
              
              <form onSubmit={handleWeightSubmit} className="flex items-center gap-3">
                <div className="flex-1">
                  <input
                    type="number"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary-light"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    placeholder="Ej: 70.5 kg"
                    step="0.1"
                    min="30"
                    max="200"
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md transition-colors"
                >
                  Guardar
                </button>
              </form>
            </div>
          )}
          
          {/* Ejercicios más frecuentes */}
          <div className="card p-4 mb-6">
            <h3 className="text-lg font-medium mb-4">Ejercicios más frecuentes</h3>
            {topExercises && topExercises.length > 0 ? (
              <div className="space-y-2">
                {topExercises.map((exercise, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span>{exercise.name}</span>
                    <span className="badge">{exercise.count} veces</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                No hay datos de ejercicios para esta semana
              </p>
            )}
          </div>
          
          {/* Proyección de peso (si está disponible) */}
          {weightProjection && (
            <div className="card p-4 mb-6">
              <h3 className="text-lg font-medium mb-4">Proyección de peso</h3>
              <div className="text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-2">
                  Basado en tu progreso, podrías alcanzar
                </p>
                <p className="text-2xl font-bold">{weightProjection} kg</p>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  en 4 semanas
                </p>
              </div>
            </div>
          )}
          
          {/* Navegación a otros resúmenes */}
          <div className="flex gap-4 mt-8">
            <a
              href={`/${userId}/resumen/mensual`}
              className="flex-1 py-3 text-center bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Ver resumen mensual
            </a>
            <a
              href={`/${userId}/resumen/anual`}
              className="flex-1 py-3 text-center bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Ver resumen anual
            </a>
          </div>
        </>
      )}
    </div>
  );
}
