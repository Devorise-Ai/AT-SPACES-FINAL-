import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { createEvent, EventAttributes } from 'ics';

export const getBookingCalendar = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = (req as any).user.id;
        const role = (req as any).user.role;

        const booking = await prisma.booking.findUnique({
            where: { id: Number(id) },
            include: { branch: true, vendorService: { include: { service: true } } }
        });

        // PT-CRIT-01 Mitigation: Strict Object-Level Authorization
        if (!booking || (booking.customerId !== userId && role !== 'ADMIN')) {
            if (booking && booking.customerId !== userId) {
                // Audit cross-user access attempts
                await prisma.auditLog.create({
                    data: {
                        actorId: userId,
                        actorRole: role,
                        action: 'UNAUTHORIZED_BOOKING_ACCESS_ATTEMPT',
                        targetType: 'BOOKING',
                        targetId: Number(id),
                        newValue: JSON.stringify({ endpoint: 'calendar' })
                    }
                });
            }
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
        const userId = (req as any).user.id;
        const role = (req as any).user.role;

        const booking = await prisma.booking.findUnique({
            where: { id: Number(id) },
            include: { branch: true }
        });

        // PT-CRIT-01 Mitigation: Strict Object-Level Authorization
        if (!booking || (booking.customerId !== userId && role !== 'ADMIN')) {
            if (booking && booking.customerId !== userId) {
                await prisma.auditLog.create({
                    data: {
                        actorId: userId,
                        actorRole: role,
                        action: 'UNAUTHORIZED_BOOKING_ACCESS_ATTEMPT',
                        targetType: 'BOOKING',
                        targetId: Number(id),
                        newValue: JSON.stringify({ endpoint: 'map' })
                    }
                });
            }
            res.status(404).json({ error: 'Booking not found' });
            return;
        }

        if (!booking.branch) {
            res.status(404).json({ error: 'Branch location not found' });
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

const MAX_BOOKING_DURATION_HOURS = 48;

export const checkAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
        const { vendorServiceId, startTime, endTime, quantity } = req.body;

        // PT-HIGH-01 Mitigation: Centralized Request Validation
        if (!vendorServiceId || !startTime || !endTime || quantity === undefined) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        const parsedQuantity = parseInt(quantity as string);
        if (isNaN(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > 100) {
            res.status(400).json({ error: 'Invalid quantity. Must be between 1 and 100.' });
            return;
        }

        const start = new Date(startTime);
        const end = new Date(endTime);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            res.status(400).json({ error: 'Invalid start or end time format.' });
            return;
        }

        if (start >= end) {
            res.status(400).json({ error: 'Start time must be before end time.' });
            return;
        }

        const durationHours = (end.getTime() - start.getTime()) / 36e5;
        if (durationHours > MAX_BOOKING_DURATION_HOURS) {
            res.status(400).json({ error: `Duration cannot exceed ${MAX_BOOKING_DURATION_HOURS} hours.` });
            return;
        }

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
            const overlappingBookings = await prisma.booking.aggregate({
                where: {
                    vendorServiceId: parseInt(vendorServiceId),
                    bookingStatus: { in: ['UPCOMING', 'COMPLETED'] },
                    OR: [
                        { startTime: { lt: end }, bookingDate: { gt: start } }, // Check for actual time overlap
                        { startTime: { lt: end }, startTime: { gte: start } }
                    ]
                },
                _sum: { numPeople: true }
            });
            const bookedQuantity = overlappingBookings._sum.numPeople || 0;
            isAvailable = (vendorService.capacity - bookedQuantity) >= parsedQuantity;
        } else {
            // Room/Office time slot check
            const conflict = await prisma.booking.findFirst({
                where: {
                    vendorServiceId: parseInt(vendorServiceId),
                    bookingStatus: { in: ['UPCOMING', 'COMPLETED'] },
                    startTime: { lt: end },
                    OR: [
                        { startTime: { lte: start }, duration: { gt: (start.getTime() - start.getTime()) / 36e5 } } // Simplify overlap
                    ],
                    // More precise overlap: start1 < end2 AND start2 < end1
                    // where end = startTime + duration
                }
            });

            // Re-evaluating overlap logic for rooms
            const existingBookings = await prisma.booking.findMany({
                where: {
                    vendorServiceId: parseInt(vendorServiceId),
                    bookingStatus: { in: ['UPCOMING', 'COMPLETED'] },
                }
            });

            const hasConflict = existingBookings.some(b => {
                const bStart = new Date(b.startTime).getTime();
                const bEnd = bStart + (b.duration * 36e5);
                return start.getTime() < bEnd && end.getTime() > bStart;
            });

            isAvailable = !hasConflict;
        }

        // PT-HIGH-01 Mitigation: Server-side price safety
        const estimatedPrice = Math.max(0, (Number(vendorService.pricePerHour) || 0) * durationHours * parsedQuantity);

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

            // PT-HIGH-01 Mitigation: Double-check validation in transaction
            if (start >= end) throw new Error('Invalid time range');
            const durationHours = (end.getTime() - start.getTime()) / 36e5;
            if (durationHours > MAX_BOOKING_DURATION_HOURS) throw new Error('Exceeded maximum duration');

            const parsedQuantity = parseInt(quantity as string);
            if (isNaN(parsedQuantity) || parsedQuantity < 1) throw new Error('Invalid quantity');

            // PT-HIGH-01 Mitigation: Server-side price calculation safety
            const totalPrice = Math.max(0, (Number(vendorService.pricePerHour) || 0) * durationHours * parsedQuantity);

            const booking = await tx.booking.create({
                data: {
                    bookingNumber: `BKG-${Date.now()}`,
                    customerId: userId,
                    vendorServiceId: vendorService.id,
                    branchId: vendorService.branchId,
                    bookingDate: start,
                    startTime: start,
                    duration: Math.ceil(durationHours),
                    numPeople: parsedQuantity,
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
                branch: true,
                vendorService: {
                    include: { service: true }
                }
            },
            orderBy: { bookingDate: 'desc' }
        });

        const formatted = bookings.map((b: any) => ({
            id: b.id,
            bookingNumber: b.bookingNumber,
            branchId: b.branchId,
            branchName: b.branch?.name || '',
            branch: b.branch,
            service: b.vendorService?.service,
            startTime: b.startTime,
            endTime: new Date(new Date(b.startTime).getTime() + b.duration * 3600000).toISOString(),
            totalPrice: b.totalPrice,
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
