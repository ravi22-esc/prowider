import { prisma } from "./prisma";

const MANDATORY: Record<number, number[]> = {
    1: [1],
    2: [5],
    3: [1, 4],
};

const FAIR_POOL: Record<number, number[]> = {
    1: [2, 3, 4],
    2: [6, 7, 8],
    3: [2, 3, 5, 6, 7, 8],
};

interface Provider {
    id: number;
    name: string;
    monthlyQuota: number;
    leadsReceived: number;
}

export async function assignProviders(leadId: number, serviceId: number) {
    await prisma.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock(${serviceId})`
    );

    const mandatory = MANDATORY[serviceId] || [];
    const fairPool = FAIR_POOL[serviceId] || [];
    const totalSlots = 3;
    const assigned: number[] = [];

    const allProviders: Provider[] = await prisma.provider.findMany();

    const getProvider = (num: number): Provider | undefined =>
        allProviders.find((p: Provider) => p.name === `Provider ${num}`);

    // Step 1 — Mandatory providers
    for (const num of mandatory) {
        const provider = getProvider(num);
        if (!provider) continue;
        if (provider.leadsReceived >= provider.monthlyQuota) continue;
        if (assigned.includes(provider.id)) continue;
        assigned.push(provider.id);
    }

    // Step 2 — Fair pool round-robin
    const slotsNeeded = totalSlots - assigned.length;

    if (slotsNeeded > 0 && fairPool.length > 0) {
        const state = await prisma.allocationState.findUnique({
            where: { serviceId },
        });

        const currentIndex = state?.lastIndex ?? 0;

        const fairProviders: Provider[] = fairPool
            .map((num: number) => getProvider(num))
            .filter((p): p is Provider => p !== undefined);

        let index = currentIndex;
        let filled = 0;
        let attempts = 0;
        const maxAttempts = fairProviders.length * 2;

        while (filled < slotsNeeded && attempts < maxAttempts) {
            const safeIndex = index % fairProviders.length;
            const provider = fairProviders[safeIndex];
            index++;
            attempts++;

            if (!provider) continue;
            if (provider.leadsReceived >= provider.monthlyQuota) continue;
            if (assigned.includes(provider.id)) continue;

            assigned.push(provider.id);
            filled++;
        }

        const newIndex = fairProviders.length > 0
            ? index % fairProviders.length
            : 0;

        await prisma.allocationState.update({
            where: { serviceId },
            data: { lastIndex: newIndex },
        });
    }

    // Step 3 — Create assignments + increment counts
    for (const providerId of assigned) {
        await prisma.leadAssignment.create({
            data: { leadId, providerId },
        });
        await prisma.provider.update({
            where: { id: providerId },
            data: { leadsReceived: { increment: 1 } },
        });
    }

    return assigned;
}