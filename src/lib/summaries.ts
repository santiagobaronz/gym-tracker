import { PrismaClient } from '@prisma/client';
import { startOfWeek, endOfWeek, subWeeks, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { WeeklySummaryData, WeightEntry } from '@/types';

const prisma = new PrismaClient();

/**
 * Obtiene o genera el resumen semanal para un usuario y fecha específicos
 * @param userId ID del usuario
 * @param weekStartDate Fecha de inicio de la semana (opcional, por defecto la semana actual)
 */
export async function getWeeklySummary(userId: string, weekStartDate?: Date | string): Promise<WeeklySummaryData | null> {
  try {
    // Determinar la fecha de inicio de la semana
    let weekStart: Date;
    if (weekStartDate) {
      weekStart = typeof weekStartDate === 'string' 
        ? startOfWeek(parseISO(weekStartDate), { weekStartsOn: 1 })
        : startOfWeek(weekStartDate, { weekStartsOn: 1 });
    } else {
      // Por defecto, usar la semana actual
      weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    }

    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

    // Buscar si ya existe un resumen para esta semana
    let summary = await prisma.weeklySummary.findFirst({
      where: {
        userId,
        weekStart,
      },
    });

    // Si no existe, generarlo
    if (!summary) {
      // Obtener todas las sesiones del usuario en esa semana
      const sessions = await prisma.session.findMany({
        where: {
          userId,
          date: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
        include: {
          exercises: {
            include: {
              exercise: true,
            },
          },
        },
        orderBy: {
          date: 'asc',
        },
      });

      // Calcular estadísticas
      const totalSessions = sessions.length;
      const totalMin = sessions.reduce((sum, session) => sum + session.durationMin, 0);
      
      // Contar ejercicios únicos
      const uniqueExercises = new Set();
      sessions.forEach(session => {
        session.exercises.forEach(exercise => {
          uniqueExercises.add(exercise.exerciseId);
        });
      });
      const totalExercises = uniqueExercises.size;

      // Crear el resumen semanal solo si hay sesiones
      if (totalSessions > 0) {
        summary = await prisma.weeklySummary.create({
          data: {
            userId,
            weekStart,
            sessions: totalSessions,
            totalMin,
            totalExercises,
          },
        });
      }
    }

    // Obtener los ejercicios más frecuentes
    const topExercisesResult = await prisma.$queryRaw`
      SELECT e.name, COUNT(se.exerciseId) as count
      FROM "SessionExercise" se
      JOIN "Exercise" e ON se."exerciseId" = e.id
      JOIN "Session" s ON se."sessionId" = s.id
      WHERE s."userId" = ${userId}
      AND s.date >= ${weekStart}
      AND s.date <= ${weekEnd}
      GROUP BY e.name
      ORDER BY count DESC
      LIMIT 5
    `;

    // Obtener la entrada de peso para esta semana
    const weightEntry = await prisma.weightEntry.findFirst({
      where: {
        userId,
        weekStart,
      },
    });

    // Obtener entradas de peso anteriores para calcular proyección
    const previousWeightEntries = await prisma.weightEntry.findMany({
      where: {
        userId,
        weekStart: {
          lt: weekStart,
        },
      },
      orderBy: {
        weekStart: 'desc',
      },
      take: 4, // Últimas 4 entradas para calcular tendencia
    });

    // Calcular proyección de peso
    let weightProjection: number | undefined;
    if (previousWeightEntries.length >= 2) {
      // Ordenar por fecha
      const sortedEntries = [...previousWeightEntries].sort(
        (a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime()
      );
      
      // Calcular la tendencia promedio
      let totalChange = 0;
      for (let i = 1; i < sortedEntries.length; i++) {
        totalChange += sortedEntries[i].weightKg - sortedEntries[i - 1].weightKg;
      }
      
      const averageChange = totalChange / (sortedEntries.length - 1);
      const lastWeight = sortedEntries[sortedEntries.length - 1].weightKg;
      
      // Proyección para la próxima semana
      weightProjection = lastWeight + averageChange;
    }

    // Formatear los ejercicios más frecuentes
    const topExercises = Array.isArray(topExercisesResult) 
      ? topExercisesResult.map((ex: any) => ({
          name: ex.name,
          count: Number(ex.count),
        }))
      : [];

    // Construir el objeto de respuesta
    const weekSummaryData: WeeklySummaryData = {
      weekStart,
      sessions: summary ? summary.sessions : 0,
      totalMin: summary ? summary.totalMin : 0,
      totalExercises: summary ? summary.totalExercises : 0,
      topExercises,
      weightEntry: weightEntry || undefined,
      weightProjection,
    };

    return weekSummaryData;
  } catch (error) {
    console.error('Error al obtener el resumen semanal:', error);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Obtiene las entradas de peso de un usuario
 * @param userId ID del usuario
 * @param limit Número máximo de entradas a obtener
 */
export async function getUserWeightEntries(userId: string, limit = 10): Promise<WeightEntry[]> {
  try {
    const weightEntries = await prisma.weightEntry.findMany({
      where: {
        userId,
      },
      orderBy: {
        weekStart: 'desc',
      },
      take: limit,
    });

    return weightEntries;
  } catch (error) {
    console.error('Error al obtener entradas de peso:', error);
    return [];
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Registra una nueva entrada de peso para un usuario
 * @param userId ID del usuario
 * @param weightKg Peso en kilogramos
 * @param weekStart Fecha de inicio de la semana (opcional, por defecto la semana actual)
 */
export async function registerWeightEntry(
  userId: string, 
  weightKg: number, 
  weekStart?: Date
): Promise<WeightEntry | null> {
  try {
    // Determinar la fecha de inicio de la semana
    const weekStartDate = weekStart 
      ? startOfWeek(weekStart, { weekStartsOn: 1 }) 
      : startOfWeek(new Date(), { weekStartsOn: 1 });

    // Crear o actualizar la entrada de peso
    const weightEntry = await prisma.weightEntry.upsert({
      where: {
        userId_weekStart: {
          userId,
          weekStart: weekStartDate,
        },
      },
      update: {
        weightKg,
      },
      create: {
        userId,
        weekStart: weekStartDate,
        weightKg,
      },
    });

    return weightEntry;
  } catch (error) {
    console.error('Error al registrar peso:', error);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Formatea una fecha en formato legible en español
 * @param date Fecha a formatear
 * @param formatStr Formato a utilizar (opcional)
 */
export function formatDateES(date: Date, formatStr = 'dd MMMM yyyy'): string {
  return format(date, formatStr, { locale: es });
}

/**
 * Formatea un rango de fechas en formato legible en español
 * @param startDate Fecha de inicio
 * @param endDate Fecha de fin
 */
export function formatDateRangeES(startDate: Date, endDate: Date): string {
  return `${format(startDate, 'd MMM', { locale: es })} - ${format(endDate, 'd MMM', { locale: es })}`;
}
