import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assignProviders } from "@/lib/allocate";
import { notifyClients } from "../sse/route";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, phone, city, serviceId, description } = body;

        if (!name || !phone || !city || !serviceId || !description) {
            return NextResponse.json(
                { error: "All fields are required" },
                { status: 400 }
            );
        }

        const existing = await prisma.lead.findUnique({
            where: { phone_serviceId: { phone, serviceId: Number(serviceId) } },
        });

        if (existing) {
            return NextResponse.json(
                { error: "You have already submitted a request for this service" },
                { status: 409 }
            );
        }

        const lead = await prisma.lead.create({
            data: {
                name,
                phone,
                city,
                description,
                serviceId: Number(serviceId),
            },
        });

        await assignProviders(lead.id, Number(serviceId));

        // Push real-time update to all open dashboards
        notifyClients();

        return NextResponse.json(
            { success: true, leadId: lead.id },
            { status: 201 }
        );
    } catch (error: unknown) {
        const code = (error as { code?: string }).code;
        if (code === "P2002") {
            return NextResponse.json(
                { error: "You have already submitted a request for this service" },
                { status: 409 }
            );
        }
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}