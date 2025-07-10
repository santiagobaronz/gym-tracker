import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { startOfWeek, endOfWeek, format } from "date-fns";

const prisma = new PrismaClient();

/**
 * GET - Obtiene el resumen semanal compartido entre usuarios
 * Incluye estadísticas de ambos usuarios y días que coincidieron
 */
export async function GET(request: Request) {
  try {
    // Obtener parámetros de consulta
    const url = new URL(request.url);
    const weekStartParam = url.searchParams.get("weekStart");

    // Determinar la fecha de inicio de semana
    const weekStart = weekStartParam 
      ? startOfWeek(new Date(weekStartParam), { weekStartsOn: 1 })
      : startOfWeek(new Date(), { weekStartsOn: 1 });
    
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

    // Obtener todos los usuarios (en este caso, solo Vanessa y Santiago)
    const users = await prisma.user.findMany();

    if (users.length < 2) {
      return NextResponse.json(
        { error: "Se necesitan al menos 2 usuarios para el resumen compartido" },
        { status: 400 }
      );
    }

    // Obtener sesiones de todos los usuarios para la semana seleccionada
    const userSummaries = await Promise.all(
      users.map(async (user) => {
        // Obtener sesiones del usuario para la semana
        const sessions = await prisma.session.findMany({
          where: {
            userId: user.id,
            date: {
              gte: weekStart,
              lte: weekEnd,
            },
          },
          include: {
            exercises: true,
          },
        });

        // Calcular estadísticas del usuario
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

        // Obtener días en los que el usuario entrenó
        const trainingDays = sessions.map(session => 
          format(new Date(session.date), "yyyy-MM-dd")
        );

        return {
          userId: user.id,
          name: user.name,
          img: user.img || `/images/avatars/${user.name.toLowerCase()}.png`,
          sessions: totalSessions,
          totalMin,
          totalExercises,
          trainingDays,
          sameDays: 0, // Se calculará después
        };
      })
    );

    // Calcular días que coincidieron entrenando
    const user1Days = new Set(userSummaries[0].trainingDays);
    const user2Days = new Set(userSummaries[1].trainingDays);
    
    const sameDays = [...user1Days].filter(day => user2Days.has(day));
    
    userSummaries[0].sameDays = sameDays.length;
    userSummaries[1].sameDays = sameDays.length;

    // Eliminar la propiedad trainingDays que ya no necesitamos
    userSummaries.forEach(user => {
      delete (user as any).trainingDays;
    });

    // Calcular estadísticas totales
    const totalSessions = userSummaries.reduce((sum, user) => sum + user.sessions, 0);
    const totalMin = userSummaries.reduce((sum, user) => sum + user.totalMin, 0);
    const totalExercises = userSummaries.reduce((sum, user) => sum + user.totalExercises, 0);
    
    // Calcular porcentaje de días que coincidieron
    // Si ambos entrenaron al menos un día en la semana
    const totalDays = 7; // Una semana tiene 7 días
    const sameDayPercentage = sameDays.length > 0 
      ? Math.round((sameDays.length / totalDays) * 100) 
      : 0;

    // Construir el resumen compartido
    const sharedSummary = {
      weekStart,
      weekEnd,
      totalSessions,
      totalMin,
      totalExercises,
      sameDayPercentage,
      sameDays: sameDays.length,
      users: userSummaries,
    };

    return NextResponse.json(sharedSummary);
  } catch (error) {
    console.error("Error al generar resumen compartido:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
