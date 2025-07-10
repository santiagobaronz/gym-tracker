// app/api/objetivos/[goalId]/route.ts

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

const goalUpdateSchema = z.object({
  type: z.enum(["weight", "frequency", "exercise"]).optional(),
  targetValue: z.number().positive("El valor objetivo debe ser positivo"),
});

function extractGoalId(request: Request): string | null {
  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  return segments[segments.length - 1] || null;
}

export async function GET(request: Request) {
  const goalId = extractGoalId(request);

  if (!goalId) {
    return NextResponse.json({ error: "ID no proporcionado" }, { status: 400 });
  }

  try {
    const goal = await prisma.goal.findUnique({ where: { id: goalId } });

    if (!goal) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    return NextResponse.json(goal);
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(request: Request) {
  const goalId = extractGoalId(request);

  if (!goalId) {
    return NextResponse.json({ error: "ID no proporcionado" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const result = goalUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: result.error.format() },
        { status: 400 }
      );
    }

    const existing = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!existing) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    const updated = await prisma.goal.update({
      where: { id: goalId },
      data: {
        type: result.data.type || existing.type,
        targetValue: result.data.targetValue,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(request: Request) {
  const goalId = extractGoalId(request);

  if (!goalId) {
    return NextResponse.json({ error: "ID no proporcionado" }, { status: 400 });
  }

  try {
    const existing = await prisma.goal.findUnique({ where: { id: goalId } });

    if (!existing) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    await prisma.goal.delete({ where: { id: goalId } });

    return NextResponse.json({ message: "Eliminado correctamente" });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
