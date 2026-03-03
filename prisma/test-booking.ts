const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const bookings = await prisma.booking.findMany({
        select: { id: true, bookingNumber: true, bookingStatus: true },
        take: 5
    });
    console.log(JSON.stringify(bookings, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
