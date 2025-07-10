import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    // Obtener parámetros de consulta
    const url = new URL(request.url);
    const category = url.searchParams.get("category");
    const creatorId = url.searchParams.get("creatorId");
    const search = url.searchParams.get("search");

    // Construir condiciones de filtrado
    const whereConditions: any = {};

    if (category) {
      whereConditions.category = category;
    }

    if (creatorId) {
      whereConditions.creatorId = creatorId;
    }

    if (search) {
      whereConditions.name = {
        contains: search,
        mode: "insensitive", // Búsqueda insensible a mayúsculas/minúsculas
      };
    }

    // Obtener ejercicios
    const exercises = await prisma.exercise.findMany({
      where: whereConditions,
      orderBy: {
        name: "asc", // Ordenar alfabéticamente
      },
    });

    return NextResponse.json(exercises);
  } catch (error) {
    console.error("Error al obtener ejercicios:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
