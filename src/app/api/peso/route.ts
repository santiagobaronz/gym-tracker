import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { startOfWeek } from "date-fns";

const prisma = new PrismaClient();

// Esquema de validación para el registro de peso
const weightEntrySchema = z.object({
  userId: z.string().min(1, "El ID de usuario es obligatorio"),
  weekStart: z.string().or(z.date()),
  weightKg: z.number().positive("El peso debe ser un valor positivo"),
});

/**
 * GET - Obtiene las entradas de peso de un usuario
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!) : 10;

    if (!userId) {
      return NextResponse.json(
        { error: "El parámetro userId es obligatorio" },
        { status: 400 }
      );
    }

    // Obtener entradas de peso ordenadas por fecha (más reciente primero)
    const weightEntries = await prisma.weightEntry.findMany({
      where: {
        userId,
      },
      orderBy: {
        weekStart: "desc",
      },
      take: limit,
    });

    return NextResponse.json(weightEntries);
  } catch (error) {
    console.error("Error al obtener entradas de peso:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * POST - Registra una nueva entrada de peso
 * Solo se permite una entrada de peso por semana por usuario
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validationResult = weightEntrySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { userId, weekStart, weightKg } = validationResult.data;

    // Convertir la fecha a objeto Date y obtener el inicio de la semana (lunes)
    const weekStartDate = startOfWeek(new Date(weekStart), { weekStartsOn: 1 });

    // Buscar si ya existe una entrada para esta semana
    const existingEntry = await prisma.weightEntry.findFirst({
      where: {
        userId,
        weekStart: weekStartDate,
      },
    });

    let weightEntry;

    if (existingEntry) {
      // Actualizar la entrada existente
      weightEntry = await prisma.weightEntry.update({
        where: {
          id: existingEntry.id,
        },
        data: {
          weightKg,
        },
      });
    } else {
      // Crear una nueva entrada
      weightEntry = await prisma.weightEntry.create({
        data: {
          userId,
          weekStart: weekStartDate,
          weightKg,
        },
      });
    }

    return NextResponse.json(weightEntry, { status: 201 });
  } catch (error) {
    console.error("Error al registrar peso:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
