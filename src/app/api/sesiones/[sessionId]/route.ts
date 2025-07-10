import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Validación para ejercicios
const sessionExerciseSchema = z.object({
  id: z.string().optional(),
  exerciseId: z.string().min(1, "El ejercicio es obligatorio"),
  sets: z.number().min(1, "Mínimo 1 serie"),
  reps: z.number().min(1, "Mínimo 1 repetición"),
  weightKg: z.number().min(0, "El peso no puede ser negativo"),
});

// Validación para la sesión
const sessionUpdateSchema = z.object({
  date: z.string().or(z.date()),
  durationMin: z.number().min(1, "La duración debe ser al menos 1 minuto"),
  notes: z.string().optional(),
  exercises: z.array(sessionExerciseSchema).min(1, "Debe añadir al menos un ejercicio"),
});

// Utilidad para extraer sessionId de la URL
function extractSessionId(request: Request): string | null {
  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  return segments[segments.length - 1] || null;
}

// GET - Obtener una sesión
export async function GET(request: Request) {
  const sessionId = extractSessionId(request);

  if (!sessionId) {
    return NextResponse.json({ error: "ID de sesión no proporcionado" }, { status: 400 });
  }

  try {
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
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error("Error al obtener la sesión:", error);
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// PUT - Actualizar una sesión
export async function PUT(request: Request) {
  const sessionId = extractSessionId(request);

  if (!sessionId) {
    return NextResponse.json({ error: "ID de sesión no proporcionado" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validation = sessionUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { date, durationMin, notes, exercises } = validation.data;

    const existingSession = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!existingSession) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }

    const updatedSession = await prisma.$transaction(async (tx) => {
      await tx.session.update({
        where: { id: sessionId },
        data: {
          date: new Date(date),
          durationMin,
          notes,
        },
      });

      await tx.sessionExercise.deleteMany({ where: { sessionId } });

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
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Eliminar una sesión
export async function DELETE(request: Request) {
  const sessionId = extractSessionId(request);

  if (!sessionId) {
    return NextResponse.json({ error: "ID de sesión no proporcionado" }, { status: 400 });
  }

  try {
    const existingSession = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!existingSession) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.sessionExercise.deleteMany({ where: { sessionId } });
      await tx.session.delete({ where: { id: sessionId } });
    });

    return NextResponse.json({ message: "Sesión eliminada correctamente" }, { status: 200 });
  } catch (error) {
    console.error("Error al eliminar la sesión:", error);
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
