import { prisma } from './src/utils/prisma';

async function checkPrisma() {
    console.log('Prisma keys:', Object.keys(prisma));
    // Check specific models
    const models = ['auditLog', 'securityEvent', 'priceChangeLog', 'user', 'booking'];
    models.forEach(m => {
        if ((prisma as any)[m]) {
            console.log(`PASS: Model ${m} is available on prisma client`);
        } else {
            console.log(`FAIL: Model ${m} is MISSING from prisma client`);
        }
    });
    process.exit(0);
}

checkPrisma();
