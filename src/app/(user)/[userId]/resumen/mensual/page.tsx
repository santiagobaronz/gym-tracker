"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { format, subMonths, startOfMonth, endOfMonth, eachWeekOfInterval } from "date-fns";
import { es } from "date-fns/locale";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  TooltipItem,
  ChartType,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend, ChartData, ChartOptions
} from "chart.js";
import KpiCard from "@/components/KpiCard";
import { WeeklySummary, WeightEntry } from "@/types";
import toast from "react-hot-toast";

// Registrar los componentes necesarios de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

export default function MonthlySummaryPage() {
  const params = useParams();
  const userId = params.userId as string;
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonthOffset, setSelectedMonthOffset] = useState(0); // 0 = mes actual, 1 = mes anterior, etc.
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklySummary[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  // Calcular fechas para el mes seleccionado
  const today = new Date();
  const selectedMonthDate = subMonths(today, selectedMonthOffset);
  const monthStart = startOfMonth(selectedMonthDate);
  const monthEnd = endOfMonth(selectedMonthDate);
  
  // Memoizar los valores de fecha para evitar re-renderizados
  const monthStartString = monthStart.toISOString();
  const monthEndString = monthEnd.toISOString();
  
  const monthName = format(monthStart, "MMMM yyyy", { locale: es });
  const isCurrentMonth = selectedMonthOffset === 0;

  // Cargar datos del resumen mensual
  useEffect(() => {
    // Evitar múltiples llamadas simultáneas
    if (fetchingRef.current) return;
    
    const fetchMonthlySummary = async () => {
      fetchingRef.current = true;
      setIsLoading(true);
      setError(null);
      
      try {
        // Obtener todas las semanas del mes
        const weeks = eachWeekOfInterval(
          { start: monthStart, end: monthEnd },
          { weekStartsOn: 1 }
        );
        
        // Obtener resúmenes semanales para cada semana del mes
        const summariesPromises = weeks.map(weekStart => 
          fetch(`/api/resumen/generate?userId=${userId}&weekStart=${weekStart.toISOString()}`)
            .then(res => res.ok ? res.json() : null)
        );
        
        const results = await Promise.all(summariesPromises);
        
        // Filtrar resultados nulos y extraer los resúmenes
        const validSummaries = results
          .filter(result => result && result.summary)
          .map(result => result.summary);
        
        setWeeklySummaries(validSummaries);
        
        // Obtener datos de peso para el mes
        const weightResponse = await fetch(`/api/peso?userId=${userId}`);
        if (!weightResponse.ok) {
          throw new Error('Error al cargar los datos de peso');
        }
        
        const allWeightEntries = await weightResponse.json();
        
        // Filtrar entradas de peso para el mes actual
        const monthWeightEntries = allWeightEntries.filter((entry: WeightEntry) => {
          const entryDate = new Date(entry.weekStart);
          return entryDate >= monthStart && entryDate <= monthEnd;
        });
        
        setWeightEntries(monthWeightEntries);
      } catch (error) {
        console.error("Error al cargar el resumen mensual:", error);
        setError("Error al cargar los datos. Intenta de nuevo más tarde.");
        toast.error("Error al cargar los datos. Intenta de nuevo más tarde.");
      } finally {
        setIsLoading(false);
        fetchingRef.current = false;
      }
    };

    fetchMonthlySummary();
    
    // Dependencias estables
  }, [userId, selectedMonthOffset, monthStartString, monthEndString]);

  // Calcular estadísticas mensuales
  const calculateMonthlyStats = () => {
    if (weeklySummaries.length === 0) {
      return {
        totalSessions: 0,
        totalHours: 0,
        totalExercises: 0,
        avgSessionsPerWeek: 0,
      };
    }

    const totalSessions = weeklySummaries.reduce(
      (sum, summary) => sum + summary.sessions,
      0
    );
    const totalMinutes = weeklySummaries.reduce(
      (sum, summary) => sum + summary.totalMin,
      0
    );
    const totalHours = Math.round(totalMinutes / 60 * 10) / 10; // Convertir a horas con 1 decimal
    const totalExercises = weeklySummaries.reduce(
      (sum, summary) => sum + summary.totalExercises,
      0
    );
    const avgSessionsPerWeek = Math.round((totalSessions / weeklySummaries.length) * 10) / 10;

    return {
      totalSessions,
      totalHours,
      totalExercises,
      avgSessionsPerWeek,
    };
  };

  const monthlyStats = calculateMonthlyStats();

  // Preparar datos para la gráfica de peso
  const weekLabels = weightEntries.map(entry => {
    const weekStart = new Date(entry.weekStart);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return `Semana del ${format(weekStart, "d", { locale: es })} al ${format(weekEnd, "d 'de' MMMM", { locale: es })}`;
  });

  const weightChartData: ChartData<'line'> = {
    labels: weightEntries.map(() => ""),
    datasets: [
      {
        label: 'Peso (kg)',
        data: weightEntries.map(entry => entry.weightKg),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.2,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(59, 130, 246)',
        pointRadius: 5,
        pointHoverRadius: 7,
      }
    ],
  };

  const weightChartOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: { size: 12 },
          color: 'rgb(107, 114, 128)'
        }
      },
      title: {
        display: true,
        text: 'Evolución de Peso',
        color: 'rgb(107, 114, 128)',
        font: { size: 16, weight: 'bold' }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(75, 85, 99, 0.3)',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          title: function (tooltipItems: TooltipItem<ChartType>[]) {
            return weekLabels[tooltipItems[0].dataIndex];
          },
          label: function (context: TooltipItem<ChartType>) {
            return `Peso: ${context.raw} kg`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: { color: 'rgba(107, 114, 128, 0.1)' },
        ticks: { color: 'rgb(107, 114, 128)', font: { size: 11 } }
      },
      x: {
        grid: { display: false },
        ticks: {
          color: 'rgb(107, 114, 128)',
          font: { size: 10 },
          maxRotation: 0,
          minRotation: 0
        }
      }
    },
  };

  // Navegar al mes anterior
  const handlePreviousMonth = () => {
    setSelectedMonthOffset(selectedMonthOffset + 1);
  };

  // Navegar al mes siguiente (solo si no es el mes actual)
  const handleNextMonth = () => {
    if (selectedMonthOffset > 0) {
      setSelectedMonthOffset(selectedMonthOffset - 1);
    }
  };

  return (
      <div className="my-5">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={handlePreviousMonth}
          className="btn btn-icon"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>

        <h2 className="text-lg font-medium capitalize">
          {monthName}
        </h2>

        <button
          onClick={handleNextMonth}
          className={`btn btn-icon ${isCurrentMonth ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isCurrentMonth}
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
      ) : (
        <>
          {/* Tarjetas de estadísticas mensuales */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <KpiCard
              title="Sesiones"
              value={monthlyStats.totalSessions}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              }
            />
            
            <KpiCard
              title="Horas"
              value={monthlyStats.totalHours}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              }
            />
            
            <KpiCard
              title="Ejercicios"
              value={monthlyStats.totalExercises}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clipRule="evenodd" />
                </svg>
              }
            />
            
            <KpiCard
              title="Promedio"
              value={`${monthlyStats.avgSessionsPerWeek} ses/sem`}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              }
            />
          </div>
          
          {/* Gráfica de peso */}
          <div className="card p-4 mb-6">
            <h3 className="text-lg font-medium mb-4">Evolución de Peso</h3>
            {weightEntries.length > 0 ? (
              <Line data={weightChartData} options={weightChartOptions} />
            ) : (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                No hay datos de peso registrados para este mes
              </div>
            )}
          </div>
          
          {/* Resumen semanal */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Resumen Semanal</h3>
            {weeklySummaries.length > 0 ? (
              <div className="space-y-4">
                {weeklySummaries.map((summary) => (
                  <div key={summary.id} className="card p-4">
                    <h4 className="font-medium mb-2">
                      Semana del {format(new Date(summary.weekStart), "d 'de' MMMM", { locale: es })}
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <div className="text-lg font-semibold">{summary.sessions}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Sesiones</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold">{Math.round(summary.totalMin / 60 * 10) / 10}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Horas</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold">{summary.totalExercises}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Ejercicios</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card text-center py-6">
                <p className="text-gray-500 dark:text-gray-400">
                  No hay datos registrados para este mes
                </p>
              </div>
            )}
          </div>

          {/* Navegación a otros resúmenes */}
          <div className="flex gap-4 mt-8">
            <a
              href={`/${userId}/resumen/semanal`}
              className="flex-1 py-3 text-center bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Ver resumen semanal
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
