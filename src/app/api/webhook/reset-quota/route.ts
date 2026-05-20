import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyClients } from "../../sse/route";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { idempotencyKey } = body;

        if (!idempotencyKey) {
            return NextResponse.json(
                { error: "idempotencyKey is required" },
                { status: 400 }
            );
        }

        // Check if this webhook was already processed
        const existing = await prisma.webhookEvent.findUnique({
            where: { idempotencyKey },
        });

        if (existing) {
            return NextResponse.json(
                { success: true, message: "Already processed (idempotent)", skipped: true },
                { status: 200 }
            );
        }

        // Process: reset all provider quotas
        await prisma.$transaction([
            prisma.provider.updateMany({
                data: { leadsReceived: 0 },
            }),
            prisma.webhookEvent.create({
                data: { idempotencyKey },
            }),
        ]);

        // Notify dashboard
        notifyClients();

        return NextResponse.json(
            { success: true, message: "Quota reset for all providers", skipped: false },
            { status: 200 }
        );
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}