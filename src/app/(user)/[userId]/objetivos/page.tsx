"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Goal } from "@/types";

// Esquema de validación con Zod
const goalSchema = z.object({
  type: z.enum(["weight", "frequency", "exercise"], {
    required_error: "El tipo de objetivo es obligatorio",
  }),
  targetValue: z.number({
    required_error: "El valor objetivo es obligatorio",
  }).positive("El valor debe ser positivo"),
});

type GoalFormData = z.infer<typeof goalSchema>;

export default function GoalsPage() {
  const params = useParams();
  const userId = params.userId as string;
  const [isLoading, setIsLoading] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [weightEntries, setWeightEntries] = useState<any[]>([]);

  // Configurar el formulario con react-hook-form y zod
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      type: "weight",
      targetValue: 0,
    },
  });

  // Observar el tipo de objetivo seleccionado
  const selectedType = watch("type");

  // Cargar objetivos del usuario
  useEffect(() => {
    const fetchGoals = async () => {
      try {
        // Obtener objetivos
        const response = await fetch(`/api/objetivos?userId=${userId}`);
        
        if (!response.ok) {
          throw new Error('Error al cargar objetivos');
        }
        
        const data = await response.json();
        setGoals(data);
        
        // Obtener datos de peso para calcular progreso
        const weightResponse = await fetch(`/api/peso?userId=${userId}`);
        
        if (weightResponse.ok) {
          const weightData = await weightResponse.json();
          setWeightEntries(weightData);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error al cargar objetivos:", error);
        toast.error("Error al cargar los objetivos");
        setIsLoading(false);
      }
    };

    fetchGoals();
  }, [userId]);

  // Manejar el envío del formulario para crear/actualizar un objetivo
  const onSubmit = async (data: GoalFormData) => {
    setIsSubmitting(true);
    
    try {
      if (editingGoal) {
        // Actualizar objetivo existente
        const response = await fetch(`/api/objetivos/${editingGoal.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Error al actualizar objetivo");
        }
        
        const updatedGoal = await response.json();
        
        // Actualizar la lista de objetivos
        setGoals(goals.map(goal => 
          goal.id === editingGoal.id ? updatedGoal : goal
        ));
        
        toast.success("Objetivo actualizado correctamente");
      } else {
        // Crear nuevo objetivo
        const response = await fetch("/api/objetivos", {
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
          throw new Error(errorData.error || "Error al crear objetivo");
        }
        
        const newGoal = await response.json();
        
        // Actualizar la lista de objetivos
        setGoals([...goals, newGoal]);
        
        toast.success("Objetivo creado correctamente");
      }
      
      // Limpiar formulario y estado de edición
      reset();
      setEditingGoal(null);
    } catch (error) {
      console.error("Error al guardar objetivo:", error);
      toast.error(error instanceof Error ? error.message : "Error al guardar el objetivo");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejar la edición de un objetivo
  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setValue("type", goal.type as "weight" | "frequency" | "exercise");
    setValue("targetValue", goal.targetValue);
  };

  // Manejar la eliminación de un objetivo
  const handleDeleteGoal = async (goalId: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este objetivo?")) {
      try {
        const response = await fetch(`/api/objetivos/${goalId}`, {
          method: "DELETE",
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Error al eliminar objetivo");
        }
        
        // Actualizar la lista de objetivos
        setGoals(goals.filter(goal => goal.id !== goalId));
        
        toast.success("Objetivo eliminado correctamente");
        
        // Si estábamos editando este objetivo, limpiar el formulario
        if (editingGoal && editingGoal.id === goalId) {
          reset();
          setEditingGoal(null);
        }
      } catch (error) {
        console.error("Error al eliminar objetivo:", error);
        toast.error(error instanceof Error ? error.message : "Error al eliminar el objetivo");
      }
    }
  };

  // Cancelar la edición
  const handleCancelEdit = () => {
    setEditingGoal(null);
    reset();
  };

  // Obtener el texto descriptivo según el tipo de objetivo
  const getGoalTypeText = (type: string) => {
    switch (type) {
      case "weight":
        return "Peso objetivo";
      case "frequency":
        return "Sesiones por semana";
      case "exercise":
        return "Peso máximo en ejercicio";
      default:
        return "Objetivo";
    }
  };

  // Obtener la unidad según el tipo de objetivo
  const getGoalUnit = (type: string) => {
    switch (type) {
      case "weight":
        return "kg";
      case "frequency":
        return "sesiones";
      case "exercise":
        return "kg";
      default:
        return "";
    }
  };

  // Calcular progreso para el objetivo de peso
  const calculateWeightProgress = (goal: Goal) => {
    if (!weightEntries || weightEntries.length === 0) {
      return { current: 0, percentage: 0 };
    }
    
    // Ordenar entradas de peso por fecha
    const sortedEntries = [...weightEntries].sort(
      (a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime()
    );
    
    // Obtener el peso más reciente
    const latestWeight = sortedEntries[0].weightKg;
    
    // Obtener el peso inicial (el más antiguo)
    const initialWeight = sortedEntries[sortedEntries.length - 1].weightKg;
    
    // Calcular el progreso
    let percentage = 0;
    
    // Si el objetivo es aumentar de peso
    if (goal.targetValue > initialWeight) {
      const totalToGain = goal.targetValue - initialWeight;
      const gained = latestWeight - initialWeight;
      percentage = Math.min(100, Math.max(0, (gained / totalToGain) * 100));
    } 
    // Si el objetivo es perder peso
    else {
      const totalToLose = initialWeight - goal.targetValue;
      const lost = initialWeight - latestWeight;
      percentage = Math.min(100, Math.max(0, (lost / totalToLose) * 100));
    }
    
    return {
      current: latestWeight,
      percentage,
      isGain: goal.targetValue > initialWeight
    };
  };

  // Calcular progreso para el objetivo de frecuencia
  const calculateFrequencyProgress = (goal: Goal) => {
    // En una implementación real, esto sería calculado a partir de datos reales
    // Por ahora, usamos un valor fijo para la demostración
    const currentFrequency = 2; // Simulación: 2 sesiones esta semana
    const percentage = Math.min(100, Math.max(0, (currentFrequency / goal.targetValue) * 100));
    
    return {
      current: currentFrequency,
      percentage
    };
  };

  return (
    <div className="my-5">
      <h1 className="text-2xl font-bold mb-6">Mis Objetivos</h1>

      {/* Formulario para crear/editar objetivos */}
      <div className="card mb-6">
        <h2 className="text-lg font-medium mb-4">
          {editingGoal ? "Editar objetivo" : "Nuevo objetivo"}
        </h2>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Tipo de objetivo */}
          <div>
            <label className="block text-sm font-medium mb-1">Tipo de objetivo</label>
            <select
              className="input-field"
              {...register("type")}
            >
              <option value="weight">Peso corporal</option>
              <option value="frequency">Frecuencia semanal</option>
              <option value="exercise">Peso en ejercicio</option>
            </select>
            {errors.type && (
              <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>
            )}
          </div>

          {/* Valor objetivo */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {selectedType === "weight"
                ? "Peso objetivo (kg)"
                : selectedType === "frequency"
                ? "Sesiones por semana"
                : "Peso máximo (kg)"}
            </label>
            <input
              type="number"
              step={selectedType === "weight" ? "0.1" : "1"}
              className="input-field"
              placeholder={
                selectedType === "weight"
                  ? "Ej: 70.5"
                  : selectedType === "frequency"
                  ? "Ej: 4"
                  : "Ej: 100"
              }
              {...register("targetValue", { valueAsNumber: true })}
            />
            {errors.targetValue && (
              <p className="text-red-500 text-xs mt-1">{errors.targetValue.message}</p>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-2">
            {editingGoal && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </div>
              ) : editingGoal ? (
                "Actualizar"
              ) : (
                "Guardar"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Lista de objetivos */}
      <h2 className="text-lg font-medium mb-4">Objetivos actuales</h2>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : goals.length > 0 ? (
        <div className="space-y-4">
          {goals.map((goal) => (
            <div key={goal.id} className="card">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{getGoalTypeText(goal.type)}</h3>
                  <p className="text-2xl font-bold mt-1">
                    {goal.targetValue} {getGoalUnit(goal.type)}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditGoal(goal)}
                    className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="p-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Mostrar progreso para el objetivo de peso */}
              {goal.type === "weight" && weightEntries.length > 0 && (
                <div className="mt-4">
                  {(() => {
                    const progress = calculateWeightProgress(goal);
                    return (
                      <>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Actual: {progress.current.toFixed(1)} kg</span>
                          <span>Progreso: {progress.percentage.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full ${
                              progress.isGain ? "bg-green-500" : "bg-primary"
                            }`}
                            style={{ width: `${progress.percentage}%` }}
                          ></div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
              
              {/* Mostrar progreso para el objetivo de frecuencia */}
              {goal.type === "frequency" && (
                <div className="mt-4">
                  {(() => {
                    const progress = calculateFrequencyProgress(goal);
                    return (
                      <>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Esta semana: {progress.current} de {goal.targetValue} sesiones</span>
                          <span>Progreso: {progress.percentage.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                          <div
                            className="bg-primary h-2.5 rounded-full"
                            style={{ width: `${progress.percentage}%` }}
                          ></div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-8">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No tienes objetivos establecidos
          </p>
          <p className="text-sm">
            Crea tu primer objetivo utilizando el formulario de arriba
          </p>
        </div>
      )}
    </div>
  );
}
