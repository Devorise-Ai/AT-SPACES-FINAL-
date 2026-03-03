import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const newHash = await bcrypt.hash('vendor123', 10);

    const updated = await prisma.user.updateMany({
        where: { email: 'vendor@atspaces.com' },
        data: { passwordHash: newHash, status: 'ACTIVE', role: 'VENDOR' }
    });

    if (updated.count === 0) {
        // vendor doesn't exist yet — create them
        await prisma.user.create({
            data: {
                email: 'vendor@atspaces.com',
                phoneNumber: '+966501234567',
                passwordHash: newHash,
                role: 'VENDOR',
                status: 'ACTIVE',
            }
        });
        console.log('Vendor user created with password: vendor123');
    } else {
        console.log('Vendor password updated to: vendor123');
    }
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
