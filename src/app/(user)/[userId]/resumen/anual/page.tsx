"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { format, subYears, startOfYear, endOfYear } from "date-fns";
import { es } from "date-fns/locale";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
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
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

// Tipo para los datos mensuales
interface MonthlyData {
  month: string;
  monthDate: Date;
  totalSessions: number;
  totalMinutes: number;
  totalHours: number;
  totalExercises: number;
  averageWeight: number | null;
  hasData: boolean;
}

interface AnnualStats {
  totalSessions: number;
  totalMinutes: number;
  totalHours: number;
  totalExercises: number;
  averageSessionsPerMonth: number;
}

export default function YearlySummaryPage() {
  const params = useParams();
  const userId = params.userId as string;
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYearOffset, setSelectedYearOffset] = useState(0); // 0 = año actual, 1 = año anterior, etc.
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [annualStats, setAnnualStats] = useState<AnnualStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  // Calcular fechas para el año seleccionado
  const today = new Date();
  const selectedYearDate = subYears(today, selectedYearOffset);
  const yearStart = startOfYear(selectedYearDate);
  const yearEnd = endOfYear(selectedYearDate);
  
  // Memoizar los valores de fecha para evitar re-renderizados
  const yearStartString = yearStart.toISOString();
  const yearEndString = yearEnd.toISOString();
  const yearValue = yearStart.getFullYear();
  
  const yearName = format(yearStart, "yyyy", { locale: es });
  const isCurrentYear = selectedYearOffset === 0;

  // Cargar datos del resumen anual
  useEffect(() => {
    // Evitar múltiples llamadas simultáneas
    if (fetchingRef.current) return;
    
    const fetchYearlySummary = async () => {
      fetchingRef.current = true;
      setIsLoading(true);
      setError(null);
      
      try {
        // Obtener resumen anual
        const response = await fetch(
          `/api/resumen/annual?userId=${userId}&year=${yearValue}`
        );
        
        if (!response.ok) {
          throw new Error('Error al cargar el resumen anual');
        }
        
        const data = await response.json();
        
        setMonthlyData(data.monthlyData || []);
        setAnnualStats(data.annualStats || null);
      } catch (error) {
        console.error("Error al cargar el resumen anual:", error);
        setError("Error al cargar los datos. Intenta de nuevo más tarde.");
        toast.error("Error al cargar los datos. Intenta de nuevo más tarde.");
      } finally {
        setIsLoading(false);
        fetchingRef.current = false;
      }
    };

    fetchYearlySummary();
    
    // Dependencias estables
  }, [userId, selectedYearOffset, yearValue]);

  // Preparar datos para la gráfica de sesiones
  const sessionsChartData = {
    labels: monthlyData.map(data => data.month),
    datasets: [
      {
        label: 'Sesiones',
        data: monthlyData.map(data => data.totalSessions),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      }
    ],
  };

  // Preparar datos para la gráfica de peso
  const weightChartData = {
    labels: monthlyData.map(data => data.month),
    datasets: [
      {
        label: 'Peso (kg)',
        data: monthlyData.map(data => data.averageWeight),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        tension: 0.3,
        pointBackgroundColor: 'rgb(16, 185, 129)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(16, 185, 129)',
        pointRadius: 5,
        pointHoverRadius: 7,
      }
    ],
  };

  const chartOptions: ChartOptions<'bar'> = {
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
        text: 'Sesiones por mes',
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
        callbacks: {
          label: function(context) {
            const value = context.raw as number;
            return value ? `Peso: ${value} kg` : 'Sin datos';
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
        ticks: { color: 'rgb(107, 114, 128)', font: { size: 11 } }
      }
    },
  };

  // Navegar al año anterior
  const handlePreviousYear = () => {
    setSelectedYearOffset(selectedYearOffset + 1);
  };

  // Navegar al año siguiente (solo si no es el año actual)
  const handleNextYear = () => {
    if (selectedYearOffset > 0) {
      setSelectedYearOffset(selectedYearOffset - 1);
    }
  };

  return (
      <div className="my-5">
      <h1 className="text-2xl font-bold mb-6">Resumen Anual</h1>
      
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={handlePreviousYear}
          className="btn btn-icon"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>

        <h2 className="text-lg font-medium">
          {yearName}
        </h2>

        <button
          onClick={handleNextYear}
          className={`btn btn-icon ${isCurrentYear ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isCurrentYear}
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
      ) : monthlyData.length === 0 || !annualStats ? (
        <div className="card text-center py-8">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No hay datos disponibles para este año
          </p>
        </div>
      ) : (
        <>
          {/* Tarjetas de KPI */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <KpiCard
              title="Sesiones"
              value={annualStats.totalSessions}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              }
            />
            
            <KpiCard
              title="Horas"
              value={annualStats.totalHours}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              }
            />
            
            <KpiCard
              title="Ejercicios"
              value={annualStats.totalExercises}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clipRule="evenodd" />
                </svg>
              }
            />
            
            <KpiCard
              title="Promedio"
              value={`${annualStats.averageSessionsPerMonth} ses/mes`}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              }
            />
          </div>
          
          {/* Gráfica de sesiones por mes */}
          <div className="card p-4 mb-6">
            <h3 className="text-lg font-medium mb-4">Sesiones por mes</h3>
            <div className="h-64">
              <Bar data={sessionsChartData} options={chartOptions} />
            </div>
          </div>
          
          {/* Gráfica de evolución de peso */}
          <div className="card p-4 mb-6">
            <h3 className="text-lg font-medium mb-4">Evolución de Peso</h3>
            {monthlyData.some(data => data.averageWeight !== null) ? (
              <div className="h-64">
                <Line data={weightChartData} options={weightChartOptions} />
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                No hay datos de peso registrados para este año
              </div>
            )}
          </div>
          
          {/* Resumen mensual */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Resumen Mensual</h3>
            <div className="space-y-4">
              {monthlyData
                .filter(data => data.hasData)
                .map((data, index) => (
                  <div key={index} className="card p-4">
                    <h4 className="font-medium mb-2 capitalize">
                      {data.month}
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <div className="text-lg font-semibold">{data.totalSessions}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Sesiones</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold">{data.totalHours}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Horas</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold">{data.averageWeight ? `${data.averageWeight} kg` : "-"}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Peso prom.</div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
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
              href={`/${userId}/resumen/mensual`}
              className="flex-1 py-3 text-center bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Ver resumen mensual
            </a>
          </div>
        </>
      )}
    </div>
  );
}
