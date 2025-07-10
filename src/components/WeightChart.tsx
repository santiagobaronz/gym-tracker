import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { WeightEntry } from '@/types';

// Registrar los componentes necesarios de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface WeightChartProps {
  weightEntries: WeightEntry[];
  projection?: number;
}

export default function WeightChart({ weightEntries, projection }: WeightChartProps) {
  // Ordenar las entradas por fecha
  const sortedEntries = [...weightEntries].sort((a, b) => 
    new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime()
  );

  // Preparar datos para el gráfico
  const labels = sortedEntries.map(entry => 
    format(new Date(entry.weekStart), 'dd MMM', { locale: es })
  );
  
  const weights = sortedEntries.map(entry => entry.weightKg);
  
  // Añadir proyección si existe
  if (projection && sortedEntries.length > 0) {
    const lastDate = new Date(sortedEntries[sortedEntries.length - 1].weekStart);
    const nextWeek = new Date(lastDate);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    labels.push(format(nextWeek, 'dd MMM', { locale: es }) + ' (proy.)');
    weights.push(projection);
  }

  const data = {
    labels,
    datasets: [
      {
        label: 'Peso (kg)',
        data: weights,
        borderColor: 'rgb(59, 130, 246)', // Color azul primario
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.3,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
      }
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 12,
          },
          color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151',
        },
      },
      title: {
        display: true,
        text: 'Evolución del Peso',
        color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151',
        font: {
          size: 16,
          weight: 'bold',
        },
      },
      tooltip: {
        backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : 'rgba(255, 255, 255, 0.8)',
        titleColor: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#1f2937',
        bodyColor: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#1f2937',
        borderColor: document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151',
        },
      },
      x: {
        grid: {
          color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151',
        },
      },
    },
  };

  return (
    <div className="h-64 w-full">
      <Line data={data} options={options} />
    </div>
  );
}
