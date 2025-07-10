import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Esquema de validación para la creación de ejercicios
const exerciseSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  category: z.string().optional(),
  creatorId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    // Extraer y validar los datos del cuerpo de la solicitud
    const body = await request.json();
    const validationResult = exerciseSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { name, category, creatorId } = validationResult.data;

    // Verificar si ya existe un ejercicio con el mismo nombre
    const existingExercise = await prisma.exercise.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });

    if (existingExercise) {
      return NextResponse.json(
        { error: "Ya existe un ejercicio con este nombre" },
        { status: 409 }
      );
    }

    // Crear el nuevo ejercicio
    const exercise = await prisma.exercise.create({
      data: {
        name,
        category,
        creatorId,
      },
    });

    return NextResponse.json(exercise, { status: 201 });
  } catch (error) {
    console.error("Error al crear ejercicio:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
