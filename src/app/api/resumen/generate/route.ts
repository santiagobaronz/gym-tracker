import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { startOfWeek, endOfWeek, parseISO, format } from "date-fns";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    // Obtener parámetros de consulta
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const weekStartParam = url.searchParams.get("weekStart");

    if (!userId) {
      return NextResponse.json(
        { error: "El parámetro userId es obligatorio" },
        { status: 400 }
      );
    }

    // Determinar la fecha de inicio de la semana
    let weekStart: Date;
    if (weekStartParam) {
      weekStart = startOfWeek(parseISO(weekStartParam), { weekStartsOn: 1 });
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
          exercises: true,
        },
        orderBy: {
          date: "asc",
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

    // Obtener datos adicionales para el resumen
    // 1. Obtener las entradas de peso para esta semana y anteriores
    const weightEntries = await prisma.weightEntry.findMany({
      where: {
        userId,
        weekStart: {
          lte: weekStart,
        },
      },
      orderBy: {
        weekStart: "desc",
      },
      take: 5,
    });

    // 2. Obtener los ejercicios más frecuentes usando Prisma en vez de SQL raw
    let topExercises: { name: string; count: number }[] = [];
    
    try {
      // Intentar obtener los ejercicios más frecuentes
      const sessionExercises = await prisma.sessionExercise.findMany({
        where: {
          session: {
            userId,
            date: {
              gte: weekStart,
              lte: weekEnd,
            },
          },
        },
        include: {
          exercise: true,
          session: true,
        },
      });
      
      // Procesar los resultados para obtener los ejercicios más frecuentes
      const exerciseCounts: Record<string, { name: string; count: number }> = {};
      
      sessionExercises.forEach(se => {
        if (se.exercise) {
          const name = se.exercise.name;
          if (!exerciseCounts[name]) {
            exerciseCounts[name] = { name, count: 0 };
          }
          exerciseCounts[name].count += 1;
        }
      });
      
      // Convertir a array y ordenar
      topExercises = Object.values(exerciseCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    } catch (error) {
      console.error("Error al obtener ejercicios más frecuentes:", error);
      // Si hay error, devolver array vacío
      topExercises = [];
    }

    // 3. Obtener objetivos del usuario
    const goals = await prisma.goal.findMany({
      where: {
        userId,
      },
    });

    // Formatear la respuesta
    const response = {
      summary: summary || null,
      weekRange: {
        start: format(weekStart, "yyyy-MM-dd"),
        end: format(weekEnd, "yyyy-MM-dd"),
      },
      weightEntries,
      topExercises,
      goals,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error al generar resumen:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
