import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const providers = await prisma.provider.findMany({
        orderBy: { id: "asc" },
        include: {
            assignments: {
                include: {
                    lead: {
                        include: { service: true },
                    },
                },
                orderBy: { createdAt: "desc" },
            },
        },
    });

    return NextResponse.json(providers);
}