import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { startOfWeek, endOfWeek, subWeeks } from "date-fns";

const prisma = new PrismaClient();

// Función para generar el resumen semanal de un usuario
async function generateUserWeeklySummary(userId: string, weekStart: Date) {
  // Calcular el fin de la semana
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 }); // Semana comienza el lunes

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

  // Buscar si ya existe un resumen para esta semana
  let summary = await prisma.weeklySummary.findFirst({
    where: {
      userId,
      weekStart,
    },
  });

  // Crear o actualizar el resumen semanal solo si hay sesiones
  if (totalSessions > 0) {
    if (summary) {
      summary = await prisma.weeklySummary.update({
        where: { id: summary.id },
        data: {
          sessions: totalSessions,
          totalMin,
          totalExercises,
        },
      });
    } else {
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

  return summary;
}

export async function GET() {
  try {
    // Calcular el inicio de la semana anterior (lunes)
    const previousWeekStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
    
    // Obtener todos los usuarios
    const users = await prisma.user.findMany();
    
    // Generar resúmenes para cada usuario
    const summaries = await Promise.all(
      users.map(user => generateUserWeeklySummary(user.id, previousWeekStart))
    );

    return NextResponse.json({
      message: "Resúmenes semanales generados correctamente",
      summaries,
    });
  } catch (error) {
    console.error("Error al generar resúmenes semanales:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
