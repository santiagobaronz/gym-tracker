"use client";

import React, { useState, useEffect, useRef } from "react";
import { format, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from "chart.js";
import KpiCard from "@/components/KpiCard";
import toast from "react-hot-toast";

// Registrar los componentes necesarios de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Tipo para los datos de usuario
interface UserSummary {
  userId: string;
  name: string;
  img: string;
  sessions: number;
  totalMin: number;
  totalExercises: number;
  sameDays: number; // Días que coincidieron entrenando
}

// Tipo para el resumen compartido
interface SharedSummary {
  weekStart: Date;
  weekEnd: Date;
  totalSessions: number;
  totalMin: number;
  totalExercises: number;
  sameDayPercentage: number;
  sameDays: number;
  users: UserSummary[];
}

export default function SharedWeeklySummaryPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0); // 0 = semana actual, 1 = semana anterior, etc.
  const [summary, setSummary] = useState<SharedSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  // Calcular fechas para la semana seleccionada
  const today = new Date();
  const selectedWeekDate = subWeeks(today, selectedWeekOffset);
  const weekStart = startOfWeek(selectedWeekDate, { weekStartsOn: 1 }); // Lunes
  const weekEnd = endOfWeek(selectedWeekDate, { weekStartsOn: 1 }); // Domingo
  
  // Memoizar los valores de fecha para evitar re-renderizados
  const weekStartString = weekStart.toISOString();
  
  const weekRange = `${format(weekStart, "d MMM", { locale: es })} - ${format(
    weekEnd,
    "d MMM",
    { locale: es }
  )}`;
  const isCurrentWeek = selectedWeekOffset === 0;

  // Cargar datos del resumen compartido
  useEffect(() => {
    // Evitar múltiples llamadas simultáneas
    if (fetchingRef.current) return;
    
    const fetchSharedSummary = async () => {
      fetchingRef.current = true;
      setIsLoading(true);
      setError(null);
      
      try {
        // Llamada real a la API
        const response = await fetch(`/api/resumen/compartido/semanal?weekStart=${weekStartString}`);
        
        if (!response.ok) {
          throw new Error('Error al cargar el resumen compartido');
        }
        
        const data = await response.json();
        
        // Convertir fechas de string a Date
        data.weekStart = new Date(data.weekStart);
        data.weekEnd = new Date(data.weekEnd);
        
        setSummary(data);
      } catch (error) {
        console.error("Error al cargar el resumen compartido:", error);
        setError("Error al cargar los datos. Intenta de nuevo más tarde.");
        toast.error("Error al cargar los datos. Intenta de nuevo más tarde.");
      } finally {
        setIsLoading(false);
        fetchingRef.current = false;
      }
    };

    fetchSharedSummary();
    
    // Dependencias estables
  }, [weekStartString]);

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

  // Preparar datos para la gráfica de comparación
  const prepareComparisonChartData = () => {
    if (!summary || !summary.users || summary.users.length < 2) {
      return {
        labels: [],
        datasets: []
      };
    }

    const labels = ['Sesiones', 'Horas', 'Ejercicios'];
    
    return {
      labels,
      datasets: summary.users.map((user) => ({
        label: user.name,
        data: [
          user.sessions,
          Math.round(user.totalMin / 60 * 10) / 10, // Convertir a horas con 1 decimal
          user.totalExercises
        ],
        backgroundColor: user.name === "Vanessa" 
          ? 'rgba(250, 204, 21, 0.6)' // Amarillo para Vanessa
          : 'rgba(34, 197, 94, 0.6)', // Verde para Santiago
        borderColor: user.name === "Vanessa" 
          ? 'rgb(250, 204, 21)' 
          : 'rgb(34, 197, 94)',
        borderWidth: 1,
      }))
    };
  };

  const comparisonChartData = prepareComparisonChartData();
  
  const comparisonChartOptions: ChartOptions<'bar'> = {
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
        text: 'Comparación semanal',
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
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(107, 114, 128, 0.1)' },
        ticks: { color: 'rgb(107, 114, 128)', font: { size: 11 } }
      },
      x: {
        grid: { display: false },
        ticks: { color: 'rgb(107, 114, 128)', font: { size: 11 } }
      }
    },
  };

  return (
    <div className="max-w-lg mx-auto  py-5">
      <h1 className="text-2xl font-bold mb-6">Resumen Compartido</h1>
      
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
      ) : !summary ? (
        <div className="card text-center py-8">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No hay datos disponibles para esta semana
          </p>
        </div>
      ) : (
        <>
          {/* Tarjetas de KPI */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <KpiCard
              title="Sesiones totales"
              value={summary.totalSessions}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              }
            />
            
            <KpiCard
              title="Horas totales"
              value={Math.round(summary.totalMin / 60 * 10) / 10}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              }
            />
            
            <KpiCard
              title="Días coincidentes"
              value={`${summary.sameDays} días`}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              }
            />
            
            <KpiCard
              title="Coincidencia"
              value={`${summary.sameDayPercentage}%`}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              }
            />
          </div>
          
          {/* Gráfica de comparación */}
          <div className="card p-4 mb-6">
            <h3 className="text-lg font-medium mb-4">Comparación semanal</h3>
            <div className="h-auto">
              <Bar data={comparisonChartData} options={comparisonChartOptions} />
            </div>
          </div>
          
          {/* Resumen por usuario */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Resumen por usuario</h3>
            <div className="space-y-4">
              {summary.users.map((user) => (
                <div key={user.userId} className="card p-4">
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden mr-3">
                      {user.img && (
                        <img src={user.img} alt={user.name} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <h4 className="font-medium">{user.name}</h4>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center border-r-2 border-gray-300 dark:border-gray-700 pr-2">
                      <div className="text-lg font-semibold">{user.sessions}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Sesiones</div>
                    </div>
                    <div className="text-center border-r-2 border-gray-300 dark:border-gray-700 pr-2">
                      <div className="text-lg font-semibold">{Math.round(user.totalMin / 60 * 10) / 10}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Horas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{user.totalExercises}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Ejercicios</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Botón para volver */}
          <div className="mt-8">
            <button
              onClick={() => window.history.back()}
              className="w-full py-3 text-center bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Volver al dashboard
            </button>
          </div>
        </>
      )}
    </div>
  );
}
