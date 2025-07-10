import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET - Obtiene la lista de usuarios
 * En este caso particular, solo tenemos dos usuarios fijos (Vanessa y Santiago)
 */
export async function GET() {
  try {
    // Obtener todos los usuarios de la base de datos
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        img: true,
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
