import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Esquema de validación para la creación/actualización de objetivos
const goalSchema = z.object({
  userId: z.string().min(1, "El ID de usuario es obligatorio"),
  type: z.enum(["weight", "frequency", "exercise"], {
    required_error: "El tipo de objetivo es obligatorio",
  }),
  targetValue: z.number().positive("El valor objetivo debe ser positivo"),
});

/**
 * GET - Obtiene los objetivos de un usuario
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const type = url.searchParams.get("type");

    if (!userId) {
      return NextResponse.json(
        { error: "El parámetro userId es obligatorio" },
        { status: 400 }
      );
    }

    // Construir condiciones de filtrado
    const whereConditions: any = { userId };

    if (type) {
      whereConditions.type = type;
    }

    // Obtener objetivos
    const goals = await prisma.goal.findMany({
      where: whereConditions,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(goals);
  } catch (error) {
    console.error("Error al obtener objetivos:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * POST - Crea un nuevo objetivo
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validationResult = goalSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { userId, type, targetValue } = validationResult.data;

    // Verificar si ya existe un objetivo del mismo tipo para el usuario
    const existingGoal = await prisma.goal.findFirst({
      where: {
        userId,
        type,
      },
    });

    if (existingGoal) {
      return NextResponse.json(
        { error: `Ya existe un objetivo de tipo '${type}' para este usuario` },
        { status: 409 }
      );
    }

    // Crear el objetivo
    const goal = await prisma.goal.create({
      data: {
        userId,
        type,
        targetValue,
      },
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    console.error("Error al crear objetivo:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
