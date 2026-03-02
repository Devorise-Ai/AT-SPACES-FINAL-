import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        await prisma.$connect();
        console.log("SUCCESS: Connected to the Supabase database.");
        const count = await prisma.user.count();
        console.log(`There are ${count} users in the database.`);
    } catch (error) {
        console.error("ERROR connecting to the database: ", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
