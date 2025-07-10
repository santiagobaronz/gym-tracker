import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { startOfYear, endOfYear, eachMonthOfInterval, startOfMonth, endOfMonth, format } from "date-fns";

const prisma = new PrismaClient();

/**
 * GET - Obtiene el resumen anual para un usuario específico
 * Incluye datos mensuales de sesiones, minutos, ejercicios y peso
 */
export async function GET(request: Request) {
  try {
    // Obtener parámetros de consulta
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const yearParam = url.searchParams.get("year");

    if (!userId) {
      return NextResponse.json(
        { error: "El parámetro userId es obligatorio" },
        { status: 400 }
      );
    }

    // Determinar el año a consultar
    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();
    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(new Date(year, 0, 1));

    // Obtener todos los meses del año
    const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

    // Procesar cada mes
    const monthlyData = await Promise.all(
      months.map(async (monthDate) => {
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const monthName = format(monthDate, "MMMM");

        // Obtener sesiones del mes
        const sessions = await prisma.session.findMany({
          where: {
            userId,
            date: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
          include: {
            exercises: true,
          },
        });

        // Calcular estadísticas mensuales
        const totalSessions = sessions.length;
        const totalMinutes = sessions.reduce((sum, session) => sum + session.durationMin, 0);
        
        // Contar ejercicios únicos
        const uniqueExercises = new Set();
        sessions.forEach(session => {
          session.exercises.forEach(exercise => {
            uniqueExercises.add(exercise.exerciseId);
          });
        });
        const totalExercises = uniqueExercises.size;

        // Obtener registros de peso del mes
        const weightEntries = await prisma.weightEntry.findMany({
          where: {
            userId,
            weekStart: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
          orderBy: {
            weekStart: "asc",
          },
        });

        // Calcular peso promedio del mes (si hay registros)
        const averageWeight = weightEntries.length > 0
          ? weightEntries.reduce((sum, entry) => sum + entry.weightKg, 0) / weightEntries.length
          : null;

        return {
          month: monthName,
          monthDate: monthDate,
          totalSessions,
          totalMinutes,
          totalHours: Math.round(totalMinutes / 60 * 10) / 10, // Convertir a horas con 1 decimal
          totalExercises,
          averageWeight,
          hasData: totalSessions > 0 || weightEntries.length > 0,
        };
      })
    );

    // Filtrar meses futuros (para el año actual)
    const currentDate = new Date();
    const filteredMonthlyData = monthlyData.filter(
      (data) => data.hasData || data.monthDate <= currentDate
    );

    // Calcular estadísticas anuales
    const annualStats = {
      totalSessions: filteredMonthlyData.reduce((sum, month) => sum + month.totalSessions, 0),
      totalMinutes: filteredMonthlyData.reduce((sum, month) => sum + month.totalMinutes, 0),
      totalHours: Math.round(filteredMonthlyData.reduce((sum, month) => sum + month.totalMinutes, 0) / 60 * 10) / 10,
      totalExercises: new Set(filteredMonthlyData.flatMap(month => Array.from({ length: month.totalExercises }))).size,
      averageSessionsPerMonth: filteredMonthlyData.length > 0
        ? Math.round(filteredMonthlyData.reduce((sum, month) => sum + month.totalSessions, 0) / filteredMonthlyData.filter(m => m.hasData).length * 10) / 10
        : 0,
    };

    return NextResponse.json({
      year,
      monthlyData: filteredMonthlyData,
      annualStats,
    });
  } catch (error) {
    console.error("Error al generar resumen anual:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
