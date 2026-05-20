import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assignProviders } from "@/lib/allocate";
import { notifyClients } from "../../sse/route";

export async function POST() {
    try {
        const services = await prisma.service.findMany();

        // Generate 10 leads simultaneously
        const promises = Array.from({ length: 10 }, (_, i) => async () => {
            const service = services[i % services.length];
            const phone = `99000${String(i).padStart(5, "0")}`;

            // Skip if duplicate
            const existing = await prisma.lead.findUnique({
                where: { phone_serviceId: { phone, serviceId: service.id } },
            });
            if (existing) return null;

            const lead = await prisma.lead.create({
                data: {
                    name: `Test User ${i + 1}`,
                    phone,
                    city: "Test City",
                    description: "Bulk test lead",
                    serviceId: service.id,
                },
            });

            await assignProviders(lead.id, service.id);
            return lead.id;
        });

        // Run all 10 simultaneously to test concurrency
        const results = await Promise.all(promises.map((fn) => fn()));

        notifyClients();

        return NextResponse.json({
            success: true,
            created: results.filter(Boolean).length,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}