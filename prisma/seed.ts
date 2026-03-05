import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding the database...');

    const adminHash = await bcrypt.hash('admin123', 10);
    const vendorHash = await bcrypt.hash('vendor123', 10);
    const customerHash = await bcrypt.hash('customer123', 10);

    // 1. Create Users (Admin, Vendor, Customer)

    const admin = await prisma.user.upsert({
        where: { email: 'admin@atspaces.com' },
        update: { passwordHash: adminHash },
        create: {
            email: 'admin@atspaces.com',
            phoneNumber: '+962777000000',
            passwordHash: adminHash,
            role: 'ADMIN',
            status: 'ACTIVE',
        }
    });

    const vendor = await prisma.user.upsert({
        where: { email: 'vendor@atspaces.com' },
        update: { passwordHash: vendorHash },
        create: {
            email: 'vendor@atspaces.com',
            phoneNumber: '+962777123456',
            passwordHash: vendorHash,
            role: 'VENDOR',
            status: 'ACTIVE',
        }
    });

    const customer = await prisma.user.upsert({
        where: { email: 'customer@test.com' },
        update: { passwordHash: customerHash },
        create: {
            email: 'customer@test.com',
            phoneNumber: '+962788123456',
            passwordHash: customerHash,
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

    // 4. Create Branches in Amman
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

    const branchAmmanWest = await prisma.branch.create({
        data: {
            vendorId: vendor.id,
            name: 'AT Spaces West',
            location: 'AMMAN',
            status: 'ACTIVE',
            accessMapUrl: 'https://maps.example.com/amman-west',
            facilities: {
                create: [
                    { facilityId: wifi.id, description: '500 Mbit/s fiber connection' }
                ]
            },
            vendorServices: {
                create: [
                    {
                        serviceId: meetingRoomService.id,
                        pricePerHour: 12.00,
                        capacity: 8,
                        features: {
                            create: [
                                { featureId: projectors.id, quantity: 1 }
                            ]
                        }
                    },
                    {
                        serviceId: hotDeskService.id,
                        pricePerHour: 2.50,
                        capacity: 30,
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
