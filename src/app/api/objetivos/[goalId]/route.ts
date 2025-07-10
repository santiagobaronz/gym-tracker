import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Esquema de validación para la actualización de objetivos
const goalUpdateSchema = z.object({
  type: z.enum(["weight", "frequency", "exercise"], {
    required_error: "El tipo de objetivo es obligatorio",
  }).optional(),
  targetValue: z.number().positive("El valor objetivo debe ser positivo"),
});

/**
 * GET - Obtiene un objetivo específico
 */
export async function GET(
  request: Request,
  { params }: { params: { goalId: string } }
) {
  try {
    const goalId = params.goalId;

    // Verificar que el ID del objetivo sea válido
    if (!goalId) {
      return NextResponse.json(
        { error: "ID de objetivo no proporcionado" },
        { status: 400 }
      );
    }

    // Obtener el objetivo
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!goal) {
      return NextResponse.json(
        { error: "Objetivo no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(goal);
  } catch (error) {
    console.error("Error al obtener el objetivo:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * PUT - Actualiza un objetivo existente
 */
export async function PUT(
  request: Request,
  { params }: { params: { goalId: string } }
) {
  try {
    const goalId = params.goalId;

    // Verificar que el ID del objetivo sea válido
    if (!goalId) {
      return NextResponse.json(
        { error: "ID de objetivo no proporcionado" },
        { status: 400 }
      );
    }

    // Extraer y validar los datos del cuerpo de la solicitud
    const body = await request.json();
    const validationResult = goalUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { type, targetValue } = validationResult.data;

    // Verificar que el objetivo existe
    const existingGoal = await prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!existingGoal) {
      return NextResponse.json(
        { error: "Objetivo no encontrado" },
        { status: 404 }
      );
    }

    // Actualizar el objetivo
    const updatedGoal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        type: type || existingGoal.type,
        targetValue,
      },
    });

    return NextResponse.json(updatedGoal);
  } catch (error) {
    console.error("Error al actualizar el objetivo:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * DELETE - Elimina un objetivo
 */
export async function DELETE(
  request: Request,
  { params }: { params: { goalId: string } }
) {
  try {
    const goalId = params.goalId;

    // Verificar que el ID del objetivo sea válido
    if (!goalId) {
      return NextResponse.json(
        { error: "ID de objetivo no proporcionado" },
        { status: 400 }
      );
    }

    // Verificar que el objetivo existe
    const existingGoal = await prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!existingGoal) {
      return NextResponse.json(
        { error: "Objetivo no encontrado" },
        { status: 404 }
      );
    }

    // Eliminar el objetivo
    await prisma.goal.delete({
      where: { id: goalId },
    });

    return NextResponse.json(
      { message: "Objetivo eliminado correctamente" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error al eliminar el objetivo:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
