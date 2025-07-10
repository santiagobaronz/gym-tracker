import React, { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { Exercise, Session, SessionExercise } from '@/types';
import ExerciseSelector from './ExerciseSelector';

// Esquema de validación con Zod
const sessionExerciseSchema = z.object({
  id: z.string().optional(),
  exerciseId: z.string({
    required_error: 'El ejercicio es obligatorio',
  }),
  exerciseName: z.string().optional(),
  sets: z.number({
    required_error: 'Las series son obligatorias',
  }).min(1, 'Mínimo 1 serie'),
  reps: z.number({
    required_error: 'Las repeticiones son obligatorias',
  }).min(1, 'Mínimo 1 repetición'),
  weightKg: z.number({
    required_error: 'El peso es obligatorio',
  }).min(0, 'El peso no puede ser negativo'),
});

const sessionSchema = z.object({
  date: z.string({
    required_error: 'La fecha es obligatoria',
  }),
  durationMin: z.number({
    required_error: 'La duración es obligatoria',
  }).min(1, 'La duración debe ser al menos 1 minuto'),
  notes: z.string().optional(),
  exercises: z.array(sessionExerciseSchema).min(1, 'Debe añadir al menos un ejercicio'),
});

type SessionFormData = z.infer<typeof sessionSchema>;

interface SessionFormProps {
  initialData?: Session & { exercises: SessionExercise[] };
  onSubmit: (data: SessionFormData) => void;
  isSubmitting: boolean;
}

export default function SessionForm({ initialData, onSubmit, isSubmitting }: SessionFormProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);

  // Inicializar el formulario con datos existentes o valores por defecto
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          date: typeof initialData.date === 'string' 
            ? initialData.date 
            : (initialData.date instanceof Date 
                ? initialData.date.toISOString() 
                : new Date().toISOString()),
          exercises: initialData.exercises.map((ex) => ({
            ...ex,
            exerciseName: ex.exercise?.name,
          })),
        }
      : {
          date: new Date().toISOString(),
          durationMin: 60,
          notes: '',
          exercises: [],
        },
  });

  // Configurar el array de ejercicios
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'exercises',
  });

  // Observar la fecha seleccionada
  const selectedDate = watch('date');

  // Manejar la selección de fecha
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setValue('date', date.toISOString());
      setShowDatePicker(false);
    }
  };

  // Manejar la selección de ejercicio
  const handleExerciseSelect = (exercise: Exercise) => {
    append({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      sets: 3,
      reps: 10,
      weightKg: 10,
    });
    setSelectedExercises([...selectedExercises, exercise]);
    setShowExerciseSelector(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Fecha */}
      <div>
        <label className="block text-sm font-medium mb-1">Fecha</label>
        <div className="relative">
          <input
            type="text"
            className="input-field cursor-pointer"
            readOnly
            value={format(new Date(selectedDate), 'dd/MM/yyyy', { locale: es })}
            onClick={() => setShowDatePicker(!showDatePicker)}
          />
          {showDatePicker && (
            <div className="absolute z-10 mt-1 bg-white dark:bg-gray-800 shadow-lg rounded-md p-2">
              <DayPicker
                mode="single"
                selected={new Date(selectedDate)}
                onSelect={handleDateSelect}
                locale={es}
                className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                classNames={{
                  day_selected: 'bg-primary text-white',
                  day_today: 'text-red-500 font-bold',
                }}
              />
            </div>
          )}
          <Controller
              name="date"
              control={control}
              render={({ field }) => (
                  <input type="hidden" {...field} />
              )}
          />
          {errors.date && (
            <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>
          )}
        </div>
      </div>

      {/* Duración */}
      <div>
        <label className="block text-sm font-medium mb-1">Duración (minutos)</label>
        <input
          type="number"
          className="input-field"
          {...register('durationMin', { valueAsNumber: true })}
        />
        {errors.durationMin && (
          <p className="text-red-500 text-xs mt-1">{errors.durationMin.message}</p>
        )}
      </div>

      {/* Ejercicios */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium">Ejercicios</label>
          <button
            type="button"
            className="text-primary dark:text-primary-light text-sm"
            onClick={() => setShowExerciseSelector(true)}
          >
            + Añadir ejercicio
          </button>
        </div>

        {fields.length === 0 ? (
          <div className="text-center py-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
            <p className="text-gray-500 dark:text-gray-400">
              No hay ejercicios añadidos
            </p>
            <button
              type="button"
              className="mt-2 text-primary dark:text-primary-light"
              onClick={() => setShowExerciseSelector(true)}
            >
              + Añadir ejercicio
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md"
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">
                    {watch(`exercises.${index}.exerciseName`)}
                  </h4>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-red-500 hover:text-red-700"
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

                <input
                  type="hidden"
                  {...register(`exercises.${index}.exerciseId`)}
                />
                <input
                  type="hidden"
                  {...register(`exercises.${index}.exerciseName`)}
                />

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium mb-1">Series</label>
                    <input
                      type="number"
                      className="input-field"
                      {...register(`exercises.${index}.sets`, { valueAsNumber: true })}
                    />
                    {errors.exercises?.[index]?.sets && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.exercises[index]?.sets?.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Reps</label>
                    <input
                      type="number"
                      className="input-field"
                      {...register(`exercises.${index}.reps`, { valueAsNumber: true })}
                    />
                    {errors.exercises?.[index]?.reps && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.exercises[index]?.reps?.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Peso (kg)</label>
                    <input
                      type="number"
                      step="0.5"
                      className="input-field"
                      {...register(`exercises.${index}.weightKg`, { valueAsNumber: true })}
                    />
                    {errors.exercises?.[index]?.weightKg && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.exercises[index]?.weightKg?.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {errors.exercises && (
          <p className="text-red-500 text-xs mt-1">{errors.exercises.message}</p>
        )}
      </div>

      {/* Notas */}
      <div>
        <label className="block text-sm font-medium mb-1">Notas (opcional)</label>
        <textarea
          className="input-field min-h-[50px]"
          {...register('notes')}
        ></textarea>
      </div>

      {/* Botón de envío */}
      <div>
        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Guardando...
            </div>
          ) : initialData ? (
            'Actualizar sesión'
          ) : (
            'Guardar sesión'
          )}
        </button>
      </div>

      {/* Modal para selector de ejercicios */}
      {showExerciseSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Seleccionar ejercicio</h3>
              <button
                type="button"
                onClick={() => setShowExerciseSelector(false)}
                className="text-gray-500"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <ExerciseSelector
              onSelect={handleExerciseSelect}
              selectedExercises={selectedExercises}
            />
          </div>
        </div>
      )}
    </form>
  );
}
