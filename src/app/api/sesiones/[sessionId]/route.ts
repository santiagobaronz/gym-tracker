import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Esquema de validación para los ejercicios de una sesión
const sessionExerciseSchema = z.object({
  id: z.string().optional(),
  exerciseId: z.string().min(1, "El ejercicio es obligatorio"),
  sets: z.number().min(1, "Mínimo 1 serie"),
  reps: z.number().min(1, "Mínimo 1 repetición"),
  weightKg: z.number().min(0, "El peso no puede ser negativo"),
});

// Esquema de validación para la actualización de sesiones
const sessionUpdateSchema = z.object({
  date: z.string().or(z.date()),
  durationMin: z.number().min(1, "La duración debe ser al menos 1 minuto"),
  notes: z.string().optional(),
  exercises: z.array(sessionExerciseSchema).min(1, "Debe añadir al menos un ejercicio"),
});

// GET - Obtener una sesión específica
export async function GET(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId;

    // Verificar que el ID de la sesión sea válido
    if (!sessionId) {
      return NextResponse.json(
        { error: "ID de sesión no proporcionado" },
        { status: 400 }
      );
    }

    // Obtener la sesión con sus ejercicios
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        exercises: {
          include: {
            exercise: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Sesión no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error("Error al obtener la sesión:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PUT - Actualizar una sesión existente
export async function PUT(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId;

    // Verificar que el ID de la sesión sea válido
    if (!sessionId) {
      return NextResponse.json(
        { error: "ID de sesión no proporcionado" },
        { status: 400 }
      );
    }

    // Extraer y validar los datos del cuerpo de la solicitud
    const body = await request.json();
    const validationResult = sessionUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { date, durationMin, notes, exercises } = validationResult.data;

    // Verificar que la sesión existe
    const existingSession = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!existingSession) {
      return NextResponse.json(
        { error: "Sesión no encontrada" },
        { status: 404 }
      );
    }

    // Actualizar la sesión y sus ejercicios en una transacción
    const updatedSession = await prisma.$transaction(async (tx) => {
      // Actualizar la sesión
      await tx.session.update({
        where: { id: sessionId },
        data: {
          date: new Date(date),
          durationMin,
          notes,
        },
      });

      // Eliminar los ejercicios existentes
      await tx.sessionExercise.deleteMany({
        where: { sessionId },
      });

      // Crear los nuevos ejercicios
      for (const exercise of exercises) {
        await tx.sessionExercise.create({
          data: {
            sessionId,
            exerciseId: exercise.exerciseId,
            sets: exercise.sets,
            reps: exercise.reps,
            weightKg: exercise.weightKg,
          },
        });
      }

      // Devolver la sesión actualizada con sus ejercicios
      return tx.session.findUnique({
        where: { id: sessionId },
        include: {
          exercises: {
            include: {
              exercise: true,
            },
          },
        },
      });
    });

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error("Error al actualizar la sesión:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Eliminar una sesión
export async function DELETE(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId;

    // Verificar que el ID de la sesión sea válido
    if (!sessionId) {
      return NextResponse.json(
        { error: "ID de sesión no proporcionado" },
        { status: 400 }
      );
    }

    // Verificar que la sesión existe
    const existingSession = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!existingSession) {
      return NextResponse.json(
        { error: "Sesión no encontrada" },
        { status: 404 }
      );
    }

    // Eliminar la sesión y sus ejercicios en una transacción
    await prisma.$transaction(async (tx) => {
      // Eliminar los ejercicios de la sesión
      await tx.sessionExercise.deleteMany({
        where: { sessionId },
      });

      // Eliminar la sesión
      await tx.session.delete({
        where: { id: sessionId },
      });
    });

    return NextResponse.json(
      { message: "Sesión eliminada correctamente" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error al eliminar la sesión:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
