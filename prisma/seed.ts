import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("Seeding database...");

    await prisma.leadAssignment.deleteMany();
    await prisma.allocationState.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.provider.deleteMany();
    await prisma.service.deleteMany();
    await prisma.webhookEvent.deleteMany();

    const service1 = await prisma.service.create({ data: { name: "Service 1" } });
    const service2 = await prisma.service.create({ data: { name: "Service 2" } });
    const service3 = await prisma.service.create({ data: { name: "Service 3" } });

    console.log("✓ Services created");

    await Promise.all(
        Array.from({ length: 8 }, (_, i) =>
            prisma.provider.create({
                data: { name: `Provider ${i + 1}`, monthlyQuota: 10, leadsReceived: 0 },
            })
        )
    );

    console.log("✓ Providers created");

    // One allocation state per service — tracks round-robin index for fair distribution
    await prisma.allocationState.create({
        data: { serviceId: service1.id, lastIndex: 0 },
    });
    await prisma.allocationState.create({
        data: { serviceId: service2.id, lastIndex: 0 },
    });
    await prisma.allocationState.create({
        data: { serviceId: service3.id, lastIndex: 0 },
    });

    console.log("✓ AllocationState created");
    console.log("✅ Seed complete!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });