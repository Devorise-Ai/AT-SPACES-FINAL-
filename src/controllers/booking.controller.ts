import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { createEvent, EventAttributes } from 'ics';

export const getBookingCalendar = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const booking = await prisma.booking.findUnique({
            where: { id: Number(id) },
            include: { branch: true, vendorService: { include: { service: true } } }
        });

        if (!booking) {
            res.status(404).json({ error: 'Booking not found' });
            return;
        }

        const start = new Date(booking.startTime);

        const event: EventAttributes = {
            start: [start.getFullYear(), start.getMonth() + 1, start.getDate(), start.getHours(), start.getMinutes()],
            duration: { hours: booking.duration },
            title: `Booking at AT Spaces - ${booking.branch?.name}`,
            description: `Your booking for ${booking.vendorService?.service.name}`,
            location: booking.branch?.location,
            status: 'CONFIRMED',
        };

        createEvent(event, (error, value) => {
            if (error) {
                res.status(500).json({ error: 'Failed to generate calendar' });
                return;
            }
            res.setHeader('Content-Type', 'text/calendar');
            res.setHeader('Content-Disposition', `attachment; filename="booking-${booking.bookingNumber}.ics"`);
            res.send(value);
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

export const getBookingMap = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const booking = await prisma.booking.findUnique({
            where: { id: Number(id) },
            include: { branch: true }
        });

        if (!booking || !booking.branch) {
            res.status(404).json({ error: 'Booking or branch not found' });
            return;
        }

        const encodedAddress = encodeURIComponent(booking.branch.location);
        res.status(200).json({
            mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

export const checkAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
        const { vendorServiceId, startTime, endTime, quantity } = req.body;

        if (!vendorServiceId || !startTime || !endTime || !quantity) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        const start = new Date(startTime);
        const end = new Date(endTime);

        const vendorService = await prisma.vendorService.findUnique({
            where: { id: parseInt(vendorServiceId) },
            include: { service: true }
        });

        if (!vendorService) {
            res.status(404).json({ error: 'Service not found' });
            return;
        }

        // Service-specific availability check
        let isAvailable = false;

        if (vendorService.service.name.includes('Hot Desk')) {
            // Seat availability
            const overlappingBookings = await prisma.booking.aggregate({
                where: {
                    vendorServiceId: parseInt(vendorServiceId),
                    bookingStatus: { in: ['UPCOMING', 'COMPLETED'] },
                    OR: [
                        {
                            startTime: { lt: end },
                            bookingDate: { gt: start }
                        }
                    ]
                },
                _sum: { numPeople: true }
            });
            const bookedQuantity = overlappingBookings._sum.numPeople || 0;
            isAvailable = (vendorService.capacity - bookedQuantity) >= parseInt(quantity);
        } else if (vendorService.service.name.includes('Private Office')) {
            // Office availability (1 booking per office at a time)
            const existingBooking = await prisma.booking.findFirst({
                where: {
                    vendorServiceId: parseInt(vendorServiceId),
                    bookingStatus: { in: ['UPCOMING', 'COMPLETED'] },
                    startTime: { lt: end },
                    bookingDate: { gt: start }
                }
            });
            isAvailable = !existingBooking;
        } else {
            // Meeting Room time slot check
            const conflictingMeeting = await prisma.booking.findFirst({
                where: {
                    vendorServiceId: parseInt(vendorServiceId),
                    bookingStatus: { in: ['UPCOMING', 'COMPLETED'] },
                    startTime: { lt: end }, // Overlap logic
                    bookingDate: { gt: start }
                }
            });
            isAvailable = !conflictingMeeting;
        }

        const durationHours = Math.abs(end.getTime() - start.getTime()) / 36e5;
        const estimatedPrice = (Number(vendorService.pricePerHour) || 0) * durationHours * quantity;

        res.status(200).json({
            available: isAvailable,
            price: estimatedPrice,
            currency: 'JOD'
        });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

const verifyWebhookSignature = (req: Request) => true; // Mock

export const createBooking = async (req: Request, res: Response): Promise<void> => {
    try {
        const { vendorServiceId, startTime, endTime, quantity, paymentMethod } = req.body;
        const userId = (req as any).user.id;

        // Cash Booking Limits
        if (paymentMethod === 'CASH') {
            const activeCashBookings = await prisma.booking.count({
                where: {
                    customerId: userId,
                    paymentMethod: 'CASH',
                    paymentStatus: 'PENDING',
                    bookingStatus: 'UPCOMING'
                }
            });

            if (activeCashBookings >= 2) {
                res.status(400).json({ error: 'Maximum 2 concurrent cash bookings allowed' });
                return;
            }
        }

        // Mock Webhook/Electronic Payment Check
        if (paymentMethod !== 'CASH' && !verifyWebhookSignature(req)) {
            res.status(403).json({ error: 'Payment verification failed' });
            return;
        }

        const bookingResult = await prisma.$transaction(async (tx: any) => {
            const vendorService = await tx.vendorService.findUnique({
                where: { id: parseInt(vendorServiceId) }
            });

            if (!vendorService) throw new Error('Service not found');

            const start = new Date(startTime);
            const end = new Date(endTime);
            const durationHours = Math.abs(end.getTime() - start.getTime()) / 36e5;
            const totalPrice = (Number(vendorService.pricePerHour) || 0) * durationHours * parseInt(quantity);

            const booking = await tx.booking.create({
                data: {
                    bookingNumber: `BKG-${Date.now()}`,
                    customerId: userId,
                    vendorServiceId: vendorService.id,
                    branchId: vendorService.branchId,
                    bookingDate: start,
                    startTime: start,
                    duration: Math.ceil(durationHours),
                    numPeople: parseInt(quantity),
                    totalPrice: totalPrice,
                    paymentMethod: paymentMethod,
                    paymentStatus: paymentMethod === 'CASH' ? 'PENDING' : 'SUCCESS',
                    bookingStatus: 'UPCOMING'
                }
            });

            if (paymentMethod !== 'CASH') {
                await tx.payment.create({
                    data: {
                        transactionId: `TRX-${Date.now()}`,
                        bookingId: booking.id,
                        amount: totalPrice,
                        status: 'SUCCESS'
                    }
                });
            }

            return booking;
        });

        res.status(201).json({
            bookingId: bookingResult.id,
            bookingNumber: bookingResult.bookingNumber,
            totalPrice: bookingResult.totalPrice,
            currency: 'JOD',
            status: bookingResult.bookingStatus
        });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getMyBookings = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id; // Prevent IDOR

        const bookings = await prisma.booking.findMany({
            where: { customerId: userId },
            include: {
                branch: true
            },
            orderBy: { bookingDate: 'desc' }
        });

        const formatted = bookings.map((b: any) => ({
            id: b.id,
            bookingNumber: b.bookingNumber,
            branchName: b.branch?.name || '',
            startTime: b.startTime,
            status: b.bookingStatus
        }));

        res.status(200).json(formatted);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const cancelBooking = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = (req as any).user.id;

        const booking = await prisma.booking.findUnique({ where: { id: parseInt(id as string) } });

        if (!booking || booking.customerId !== userId) {
            res.status(404).json({ error: 'Booking not found' });
            return;
        }

        await prisma.booking.update({
            where: { id: booking.id },
            data: { bookingStatus: 'CANCELLED' }
        });

        res.status(200).json({ message: 'Booking cancelled successfully' });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
