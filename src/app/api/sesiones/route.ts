import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Esquema de validación para los ejercicios de una sesión
const sessionExerciseSchema = z.object({
  exerciseId: z.string().min(1, "El ejercicio es obligatorio"),
  sets: z.number().min(1, "Mínimo 1 serie"),
  reps: z.number().min(1, "Mínimo 1 repetición"),
  weightKg: z.number().min(0, "El peso no puede ser negativo"),
});

// Esquema de validación para la creación/actualización de sesiones
const sessionSchema = z.object({
  userId: z.string().min(1, "El usuario es obligatorio"),
  date: z.string().or(z.date()),
  durationMin: z.number().min(1, "La duración debe ser al menos 1 minuto"),
  notes: z.string().optional(),
  exercises: z.array(sessionExerciseSchema).min(1, "Debe añadir al menos un ejercicio"),
});

// GET - Obtener sesiones (con filtros opcionales)
export async function GET(request: Request) {
  try {
    // Obtener parámetros de consulta
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    if (!userId) {
      return NextResponse.json(
        { error: "El parámetro userId es obligatorio" },
        { status: 400 }
      );
    }

    // Construir condiciones de filtrado
    const whereConditions: any = {
      userId,
    };

    if (startDate && endDate) {
      whereConditions.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      whereConditions.date = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      whereConditions.date = {
        lte: new Date(endDate),
      };
    }

    // Obtener sesiones con sus ejercicios
    const sessions = await prisma.session.findMany({
      where: whereConditions,
      include: {
        exercises: {
          include: {
            exercise: true,
          },
        },
      },
      orderBy: {
        date: "desc", // Ordenar por fecha descendente (más reciente primero)
      },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Error al obtener sesiones:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Crear una nueva sesión
export async function POST(request: Request) {
  try {
    // Extraer y validar los datos del cuerpo de la solicitud
    const body = await request.json();
    const validationResult = sessionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { userId, date, durationMin, notes, exercises } = validationResult.data;

    // Verificar que el usuario existe antes de crear la sesión
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!userExists) {
      return NextResponse.json(
        { error: `El usuario con ID ${userId} no existe` },
        { status: 404 }
      );
    }

    // Verificar que todos los ejercicios existen
    const exerciseIds = exercises.map(ex => ex.exerciseId);
    const existingExercises = await prisma.exercise.findMany({
      where: { id: { in: exerciseIds } },
      select: { id: true }
    });

    if (existingExercises.length !== exerciseIds.length) {
      const foundIds = existingExercises.map(ex => ex.id);
      const missingIds = exerciseIds.filter(id => !foundIds.includes(id));
      
      return NextResponse.json(
        { error: `Los siguientes ejercicios no existen: ${missingIds.join(', ')}` },
        { status: 404 }
      );
    }

    // Crear la sesión con sus ejercicios en una transacción
    const session = await prisma.$transaction(async (tx) => {
      // Crear la sesión
      const newSession = await tx.session.create({
        data: {
          userId,
          date: new Date(date),
          durationMin,
          notes,
        },
      });

      // Crear los ejercicios de la sesión
      for (const exercise of exercises) {
        await tx.sessionExercise.create({
          data: {
            sessionId: newSession.id,
            exerciseId: exercise.exerciseId,
            sets: exercise.sets,
            reps: exercise.reps,
            weightKg: exercise.weightKg,
          },
        });
      }

      // Devolver la sesión creada con sus ejercicios
      return tx.session.findUnique({
        where: { id: newSession.id },
        include: {
          exercises: {
            include: {
              exercise: true,
            },
          },
        },
      });
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error("Error al crear sesión:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
