import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding the database...');

    // 1. Create Users (Vendor & Customer)
    const vendor = await prisma.user.upsert({
        where: { email: 'vendor@atspaces.com' },
        update: {},
        create: {
            email: 'vendor@atspaces.com',
            phoneNumber: '+962777123456',
            passwordHash: '$2a$10$xyz', // Dummy hash
            role: 'VENDOR',
            status: 'ACTIVE',
        }
    });

    const customer = await prisma.user.upsert({
        where: { email: 'customer@test.com' },
        update: {},
        create: {
            email: 'customer@test.com',
            phoneNumber: '+962788123456',
            passwordHash: '$2a$10$xyz', // Dummy hash
            role: 'CUSTOMER',
            status: 'ACTIVE',
        }
    });

    // 2. Create Facilities & Features
    const wifi = await prisma.facility.upsert({
        where: { name: 'High-Speed WiFi' },
        update: {},
        create: { name: 'High-Speed WiFi', icon: 'wifi' }
    });

    const projectors = await prisma.feature.upsert({
        where: { name: '4K Projector' },
        update: {},
        create: { name: '4K Projector', icon: 'projector' }
    });

    // 3. Create Services
    const meetingRoomService = await prisma.service.upsert({
        where: { name: 'Meeting Room - Large' },
        update: {},
        create: { name: 'Meeting Room - Large' }
    });

    const hotDeskService = await prisma.service.upsert({
        where: { name: 'Hot Desk' },
        update: {},
        create: { name: 'Hot Desk' }
    });

    // 4. Create a Branch in Amman
    const branchAmman = await prisma.branch.create({
        data: {
            vendorId: vendor.id,
            name: 'AT Spaces Central',
            location: 'AMMAN',
            status: 'ACTIVE',
            accessMapUrl: 'https://maps.example.com/amman',
            facilities: {
                create: [
                    { facilityId: wifi.id, description: '1 Gbit/s fiber connection' }
                ]
            },
            vendorServices: {
                create: [
                    {
                        serviceId: meetingRoomService.id,
                        pricePerHour: 15.00,
                        capacity: 10,
                        features: {
                            create: [
                                { featureId: projectors.id, quantity: 1 }
                            ]
                        }
                    },
                    {
                        serviceId: hotDeskService.id,
                        pricePerHour: 3.50,
                        capacity: 50,
                    }
                ]
            }
        }
    });

    console.log('Seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
