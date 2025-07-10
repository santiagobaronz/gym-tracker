// Tipos de entidades basados en el esquema de Prisma

export interface User {
  id: string;
  name: string;
  img: string;
  createdAt: Date;
}

export interface Exercise {
  id: string;
  name: string;
  category?: string;
  createdAt: Date;
  creatorId?: string;
}

export interface Session {
  id: string;
  userId: string;
  date: Date;
  durationMin: number;
  notes?: string;
  createdAt: Date;
  exercises?: SessionExercise[];
  user?: User;
}

export interface SessionExercise {
  id: string;
  sessionId: string;
  exerciseId: string;
  sets: number;
  reps: number;
  weightKg: number;
  exercise?: Exercise;
}

export interface WeeklySummary {
  id: string;
  userId: string;
  weekStart: Date;
  sessions: number;
  totalMin: number;
  totalExercises: number;
  createdAt: Date;
  user?: User;
}

export interface WeightEntry {
  id: string;
  userId: string;
  weekStart: Date;
  weightKg: number;
  createdAt: Date;
  user?: User;
}

export interface Goal {
  id: string;
  userId: string;
  type: 'weight' | 'frequency' | 'exercise';
  targetValue: number;
  createdAt: Date;
  user?: User;
}

// Tipos para formularios y solicitudes API

export interface SessionFormData {
  date: string;
  durationMin: number;
  notes?: string;
  exercises: SessionExerciseFormData[];
}

export interface SessionExerciseFormData {
  exerciseId: string;
  exerciseName?: string; // Para mostrar el nombre en la UI
  sets: number;
  reps: number;
  weightKg: number;
}

export interface ExerciseFormData {
  name: string;
  category?: string;
}

export interface WeightEntryFormData {
  weightKg: number;
  weekStart: Date;
}

export interface GoalFormData {
  type: 'weight' | 'frequency' | 'exercise';
  targetValue: number;
}

// Tipos para resúmenes y estadísticas

export interface WeeklySummaryData {
  weekStart: Date;
  sessions: number;
  totalMin: number;
  totalExercises: number;
  topExercises: {
    name: string;
    count: number;
  }[];
  weightEntry?: WeightEntry;
  weightProjection?: number;
}

export interface MonthlySummaryData {
  month: Date;
  weeklySummaries: WeeklySummary[];
  averageSessions: number;
  averageMin: number;
  totalExercises: number;
  recordSessions: number;
  recordDuration: number;
}

export interface YearlySummaryData {
  year: number;
  monthlySummaries: MonthlySummaryData[];
  totalSessions: number;
  totalMin: number;
  totalExercises: number;
  bestMonth: {
    month: number;
    sessions: number;
  };
}

export interface SharedSummaryData {
  weekStart: Date;
  totalSessions: number;
  totalMin: number;
  totalExercises: number;
  sameDayPercentage: number;
  users: {
    userId: string;
    name: string;
    sessions: number;
    totalMin: number;
  }[];
}
