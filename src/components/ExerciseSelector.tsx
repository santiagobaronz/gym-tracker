import React, { useState, useEffect } from 'react';
import { Exercise } from '@/types';
import { useUser } from '@/contexts/UserContext';
import toast from 'react-hot-toast';

interface ExerciseSelectorProps {
  onSelect: (exercise: Exercise) => void;
  selectedExercises?: Exercise[];
}

export default function ExerciseSelector({ onSelect, selectedExercises = [] }: ExerciseSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewExerciseModal, setShowNewExerciseModal] = useState(false);
  const [newExercise, setNewExercise] = useState({ name: '', category: '' });
  const { user } = useUser();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Cargar ejercicios al montar el componente o cuando cambia refreshTrigger
  useEffect(() => {
    const fetchExercises = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/ejercicios');
        
        if (!response.ok) {
          throw new Error('Error al cargar ejercicios');
        }
        
        const data = await response.json();
        console.log('Ejercicios cargados:', data);
        setExercises(data);
        
        // Extraer categorías únicas
        const uniqueCategories = Array.from(
          new Set(data.map((exercise: Exercise) => exercise.category).filter(Boolean))
        );
        setCategories(uniqueCategories as string[]);
        setIsLoading(false);
      } catch (error) {
        console.error('Error al cargar ejercicios:', error);
        toast.error('Error al cargar ejercicios');
        setIsLoading(false);
      }
    };

    fetchExercises();
  }, [refreshTrigger]);

  // Filtrar ejercicios cuando cambia el término de búsqueda o la categoría
  useEffect(() => {
    let filtered = exercises;
    
    // Filtrar por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(exercise => 
        exercise.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtrar por categoría
    if (selectedCategory) {
      filtered = filtered.filter(exercise => 
        exercise.category === selectedCategory
      );
    }
    
    // Excluir ejercicios ya seleccionados
    if (selectedExercises.length > 0) {
      const selectedIds = selectedExercises.map(ex => ex.id);
      filtered = filtered.filter(exercise => !selectedIds.includes(exercise.id));
    }
    
    setFilteredExercises(filtered);
  }, [searchTerm, selectedCategory, exercises, selectedExercises]);

  // Manejar la creación de un nuevo ejercicio
  const handleCreateExercise = async () => {
    if (!newExercise.name.trim()) return;
    
    try {
      const response = await fetch('/api/ejercicios/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newExercise.name,
          category: newExercise.category || null,
          creatorId: user?.id,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear ejercicio');
      }
      
      const createdExercise = await response.json();
      
      // Limpiar el formulario y cerrar el modal
      setNewExercise({ name: '', category: '' });
      setShowNewExerciseModal(false);
      
      // Mostrar mensaje de éxito
      toast.success('Ejercicio creado correctamente');
      
      // Incrementar el refreshTrigger para volver a cargar los ejercicios
      setRefreshTrigger(prev => prev + 1);
      
      // Seleccionar automáticamente el ejercicio recién creado
      onSelect(createdExercise);
    } catch (error) {
      console.error('Error al crear ejercicio:', error);
      toast.error(error instanceof Error ? error.message : 'Error al crear ejercicio');
    }
  };

  return (
    <div className="w-full">
      {/* Buscador */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar ejercicio..."
          className="input-field"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {/* Filtro de categorías */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          className={`px-2 py-1 text-xs rounded-full ${
            selectedCategory === null
              ? 'bg-primary text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
          }`}
          onClick={() => setSelectedCategory(null)}
        >
          Todos
        </button>
        
        {categories.map((category) => (
          <button
            key={category}
            className={`px-2 py-1 text-xs rounded-full ${
              selectedCategory === category
                ? 'bg-primary text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            }`}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>
      
      {/* Lista de ejercicios */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="max-h-60 overflow-y-auto">
          {filteredExercises.length > 0 ? (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredExercises.map((exercise) => (
                <li key={exercise.id} className="py-2">
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                    onClick={() => onSelect(exercise)}
                  >
                    <div className="font-medium">{exercise.name}</div>
                    {exercise.category && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {exercise.category}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-4 text-center text-gray-500 dark:text-gray-400">
              No se encontraron ejercicios
            </div>
          )}
        </div>
      )}
      
      {/* Botón para añadir nuevo ejercicio */}
      <div className="mt-4">
        <button
          className="btn btn-secondary w-full"
          onClick={() => setShowNewExerciseModal(true)}
        >
          + Nuevo ejercicio
        </button>
      </div>
      
      {/* Modal para crear nuevo ejercicio */}
      {showNewExerciseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Crear nuevo ejercicio</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <input
                type="text"
                className="input-field"
                value={newExercise.name}
                onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                placeholder="Nombre del ejercicio"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">Categoría</label>
              <select
                className="input-field"
                value={newExercise.category}
                onChange={(e) => setNewExercise({ ...newExercise, category: e.target.value })}
              >
                <option value="">Seleccionar categoría</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
                <option value="nueva">+ Nueva categoría</option>
              </select>
              
              {newExercise.category === 'nueva' && (
                <input
                  type="text"
                  className="input-field mt-2"
                  placeholder="Nombre de la nueva categoría"
                  onChange={(e) => setNewExercise({ ...newExercise, category: e.target.value })}
                  value=""
                />
              )}
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                className="btn bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                onClick={() => setShowNewExerciseModal(false)}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateExercise}
                disabled={!newExercise.name.trim()}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
