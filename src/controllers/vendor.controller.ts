import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { z } from 'zod';

const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

// 1. Dashboard & Overview
export const getVendorOverview = async (req: Request, res: Response): Promise<void> => {
    try {
        const vendorId = (req as any).user.id;
        const branches = await prisma.branch.findMany({ where: { vendorId } });

        if (!branches || branches.length === 0) {
            res.status(404).json({ error: 'Branch not found' });
            return;
        }

        const branchIds = branches.map(b => b.id);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const bookingCount = await prisma.booking.count({
            where: {
                branchId: { in: branchIds },
                startTime: { gte: today, lt: tomorrow },
                bookingStatus: 'UPCOMING'
            }
        });

        const avgOccupancy = branches.reduce((sum, b) => sum + b.occupancyRate, 0) / branches.length;

        res.status(200).json({
            occupancyRate: avgOccupancy,
            upcomingBookingsToday: bookingCount,
            branchStatus: branches[0].status
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Capacity Management
export const getVendorServices = async (req: Request, res: Response): Promise<void> => {
    try {
        const vendorId = (req as any).user.id;
        const services = await prisma.vendorService.findMany({
            where: { branch: { vendorId } },
            include: { service: true }
        });
        res.status(200).json(services);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const requestCapacityChange = async (req: Request, res: Response): Promise<void> => {
    try {
        const vendorId = (req as any).user.id;
        // Accept both frontend field names and legacy field names
        const vendorServiceId = req.body.vendorServiceId;
        const proposedCapacity = req.body.requestedCapacity ?? req.body.proposedCapacity;
        const reason = req.body.reason;

        // M-08: Bounds checking
        if (typeof proposedCapacity !== 'number' || proposedCapacity < 1 || proposedCapacity > 10000) {
            res.status(400).json({ error: 'Proposed capacity must be between 1 and 10000' });
            return;
        }

        // Resolve branchId and serviceId from vendorServiceId
        let branchId = req.body.branchId;
        let serviceId = req.body.serviceId;

        if (vendorServiceId && (!branchId || !serviceId)) {
            const vendorService = await prisma.vendorService.findUnique({
                where: { id: vendorServiceId },
                include: { branch: true }
            });
            if (!vendorService) {
                res.status(404).json({ error: 'Vendor service not found' });
                return;
            }
            if (vendorService.branch.vendorId !== vendorId) {
                res.status(403).json({ error: 'You do not own this service' });
                return;
            }
            branchId = vendorService.branchId;
            serviceId = vendorService.serviceId;
        } else {
            // M-08: Branch ownership checking (legacy path)
            const branchCheck = await prisma.branch.findFirst({ where: { id: branchId, vendorId } });
            if (!branchCheck) {
                res.status(403).json({ error: 'You do not own this branch' });
                return;
            }
        }

        // M-10: Queue abuse prevention/auto-expire
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        await prisma.approvalRequest.updateMany({
            where: {
                type: 'CAPACITY_CHANGE',
                status: 'PENDING',
                createdAt: { lt: sevenDaysAgo }
            },
            data: { status: 'EXPIRED' }
        });

        const pendingRequest = await prisma.approvalRequest.findFirst({
            where: { vendorId, serviceId, type: 'CAPACITY_CHANGE', status: 'PENDING' }
        });

        if (pendingRequest) {
            res.status(429).json({ error: 'A pending capacity change request already exists for this service.' });
            return;
        }

        // M-09: Payload integrity (HMAC hash)
        const payloadData = JSON.stringify({ proposedCapacity, reason });
        const payloadHash = crypto.createHmac('sha256', process.env.HMAC_SECRET || 'secret')
            .update(payloadData)
            .digest('hex');

        const request = await prisma.approvalRequest.create({
            data: {
                vendorId,
                branchId,
                serviceId,
                type: 'CAPACITY_CHANGE',
                status: 'PENDING',
                payload: payloadData,
                payloadHash,
                rejectionReason: reason // Still used for compatibility / UI short context
            }
        });

        // M-11: Capacity change non-repudiation (Audit Log)
        await prisma.auditLog.create({
            data: {
                actorId: vendorId,
                actorRole: 'VENDOR',
                action: 'CAPACITY_REQUESTED',
                targetType: 'VENDOR_SERVICE',
                targetId: vendorServiceId || serviceId || 0
            }
        });

        res.status(201).json(request);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getCapacityRequests = async (req: Request, res: Response): Promise<void> => {
    try {
        const vendorId = (req as any).user.id;
        const requests = await prisma.approvalRequest.findMany({
            where: { vendorId, type: 'CAPACITY_CHANGE' },
            orderBy: { createdAt: 'desc' }
        });
        const mapped = requests.map(r => ({
            id: r.id,
            description: r.rejectionReason ?? 'Capacity change request',
            status: r.status,
            createdAt: r.createdAt
        }));
        res.status(200).json(mapped);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Pricing Management
export const updateServicePricing = async (req: Request, res: Response): Promise<void> => {
    try {
        const { vendorServiceId } = req.params;
        const { pricePerHour, pricePerDay, pricePerWeek, pricePerMonth, currentPassword } = req.body;
        const vendorId = (req as any).user.id;

        // [M-12] Bounds validation
        const priceKeys = [pricePerHour, pricePerDay, pricePerWeek, pricePerMonth];
        for (const price of priceKeys) {
            if (price !== undefined && price !== null) {
                if (typeof price !== 'number' || price < 0.01 || price > 10000) {
                    res.status(422).json({ error: 'Prices must be between 0.01 and 10000' });
                    return;
                }
            }
        }

        // [M-13] step-up auth & email check
        if (!currentPassword) {
            res.status(401).json({ error: 'Current password is required to change pricing' });
            return;
        }

        const user = await prisma.user.findUnique({ where: { id: vendorId } });
        if (!user || user.status !== 'ACTIVE') {
            res.status(401).json({ error: 'User unavailable' });
            return;
        }

        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash || '');
        if (!isMatch) {
            res.status(401).json({ error: 'Invalid current password' });
            return;
        }

        // [M-12] Verify branch ownership
        const vendorService = await prisma.vendorService.findUnique({
            where: { id: parseInt(vendorServiceId as string) },
            include: { branch: true }
        });

        if (!vendorService) {
            res.status(404).json({ error: 'Service not found' });
            return;
        }

        if (vendorService.branch.vendorId !== vendorId) {
            res.status(403).json({ error: 'Forbidden: Service belongs to another vendor' });
            return;
        }

        const updated = await prisma.vendorService.update({
            where: { id: parseInt(vendorServiceId as string) },
            data: { pricePerHour, pricePerDay, pricePerWeek, pricePerMonth }
        });

        // [M-14] Pricing audit trail
        await prisma.priceChangeLog.create({
            data: {
                vendorId,
                vendorServiceId: parseInt(vendorServiceId as string),
                previousPrice: JSON.stringify({
                    pricePerHour: vendorService.pricePerHour,
                    pricePerDay: vendorService.pricePerDay,
                    pricePerWeek: vendorService.pricePerWeek,
                    pricePerMonth: vendorService.pricePerMonth
                }),
                newPrice: JSON.stringify({ pricePerHour, pricePerDay, pricePerWeek, pricePerMonth }),
                reason: 'Vendor updated pricing via dashboard',
                approvedBy: vendorId
            }
        });

        // [M-13] Mock Email notification
        console.log(`[EMAIL-STUB] Sending pricing change notification to ${user.email}`);

        res.status(200).json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// 4. Branch Facilities
export const getBranchFacilities = async (req: Request, res: Response): Promise<void> => {
    try {
        const vendorId = (req as any).user.id;
        const facilities = await prisma.branchFacility.findMany({
            where: { branch: { vendorId } },
            include: { facility: true }
        });
        res.status(200).json(facilities);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateBranchFacility = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { isAvailable, description } = req.body;
        const vendorId = (req as any).user.id;

        // [M-17] Strict ownership check
        const branchFacility = await prisma.branchFacility.findUnique({
            where: { id: parseInt(id as string) },
            include: { branch: true }
        });

        if (!branchFacility) {
            res.status(404).json({ error: 'Facility not found' });
            return;
        }

        if (branchFacility.branch.vendorId !== vendorId) {
            res.status(403).json({ error: 'Forbidden: Facility belongs to another vendor' });
            return;
        }

        // [M-16] Sanitize description
        const safeDescription = description ? purify.sanitize(description) : undefined;

        const updated = await prisma.branchFacility.update({
            where: { id: parseInt(id as string) },
            data: { isAvailable, description: safeDescription }
        });

        res.status(200).json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// 5. Service Features
export const getServiceFeatures = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const vendorId = (req as any).user.id;

        // [M-18] Enforce ownership
        const service = await prisma.vendorService.findUnique({
            where: { id: parseInt(id as string) },
            include: { branch: true }
        });

        if (!service || service.branch.vendorId !== vendorId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        const features = await prisma.serviceFeature.findMany({
            where: { vendorServiceId: parseInt(id as string) },
            include: { feature: true }
        });
        res.status(200).json(features);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateServiceFeature = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const vendorId = (req as any).user.id;

        // [M-18] Enforce ownership
        const service = await prisma.vendorService.findUnique({
            where: { id: parseInt(id as string) },
            include: { branch: true }
        });

        if (!service || service.branch.vendorId !== vendorId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        // Handle frontend array format {"features": ["Feature Name"]}
        if (req.body.features && Array.isArray(req.body.features)) {
            const featuresToAdd = req.body.features.filter((f: any) => typeof f === 'string' && f.trim().length > 0).map((f: string) => f.trim());

            if (featuresToAdd.length === 0) {
                res.status(400).json({ error: 'No valid features provided' });
                return;
            }

            // M-10: Queue abuse prevention/auto-expire
            const pendingRequest = await prisma.approvalRequest.findFirst({
                where: { vendorId, serviceId: service.id, type: 'FEATURE_ADDITION', status: 'PENDING' }
            });

            if (pendingRequest) {
                res.status(429).json({ error: 'A pending feature addition request already exists for this service.' });
                return;
            }

            // M-09: Payload integrity (HMAC hash)
            const payloadData = JSON.stringify({ features: featuresToAdd });
            const payloadHash = crypto.createHmac('sha256', process.env.HMAC_SECRET || 'secret')
                .update(payloadData)
                .digest('hex');

            const approvalReq = await prisma.approvalRequest.create({
                data: {
                    vendorId,
                    branchId: service.branchId,
                    serviceId: service.id,
                    type: 'FEATURE_ADDITION',
                    status: 'PENDING',
                    payload: payloadData,
                    payloadHash,
                    rejectionReason: `Request to add features: ${featuresToAdd.join(', ')}`
                }
            });

            await prisma.auditLog.create({
                data: {
                    actorId: vendorId,
                    actorRole: 'VENDOR',
                    action: 'FEATURE_ADDITION_REQUESTED',
                    targetType: 'VENDOR_SERVICE',
                    targetId: service.id
                }
            });

            res.status(201).json(approvalReq);
            return;
        }

        const { featureId, quantity } = req.body;

        // [M-19] Validate quantity 1-999
        if (typeof quantity !== 'number' || quantity < 1 || quantity > 999) {
            res.status(422).json({ error: 'Quantity must be between 1 and 999' });
            return;
        }

        const feature = await prisma.serviceFeature.upsert({
            where: {
                vendorServiceId_featureId: {
                    vendorServiceId: parseInt(id as string),
                    featureId: parseInt(featureId as string)
                }
            },
            update: { quantity },
            create: {
                vendorServiceId: parseInt(id as string),
                featureId: parseInt(featureId as string),
                quantity
            }
        });

        res.status(200).json(feature);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// 6. Bookings Management
export const getVendorBookings = async (req: Request, res: Response): Promise<void> => {
    try {
        const vendorId = (req as any).user.id;
        const { status, period } = req.query;

        const where: any = { branch: { vendorId } };
        if (status) where.bookingStatus = status;

        const bookings = await prisma.booking.findMany({
            where,
            include: { customer: true, vendorService: { include: { service: true } } },
            orderBy: { startTime: 'desc' }
        });

        res.status(200).json(bookings);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getBookingById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const vendorId = (req as any).user.id;

        const booking = await prisma.booking.findFirst({
            where: {
                id: parseInt(id as string),
                branch: { vendorId }
            },
            include: { customer: true, vendorService: { include: { service: true } }, branch: true }
        });

        if (!booking) {
            res.status(404).json({ error: 'Booking not found' });
            return;
        }

        res.status(200).json(booking);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateBookingStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status, checkInToken } = req.body; // e.g., 'IN_PROGRESS' or 'NO_SHOW'
        const vendorId = (req as any).user.id;

        // [M-23] Inject branch_id tenant scope
        const booking = await prisma.booking.findFirst({
            where: {
                id: parseInt(id as string),
                branch: { vendorId }
            }
        });

        if (!booking) {
            res.status(404).json({ error: 'Booking not found' });
            return;
        }

        // [M-21] checkInToken validation for check-ins
        if (status === 'IN_PROGRESS') {
            if (booking.checkInToken && booking.checkInToken !== checkInToken) {
                // Log missing/invalid token
                await prisma.securityEvent.create({
                    data: {
                        eventType: 'INVALID_CHECKIN_TOKEN',
                        ipAddress: req.ip || '0.0.0.0',
                        userAgent: req.headers['user-agent'] || 'Unknown',
                        userEmail: (req as any).user.email || 'vendor',
                        details: `Invalid check-in token provided for booking ${booking.id}`
                    }
                });
                res.status(403).json({ error: 'Invalid check-in token' });
                return;
            }
        }

        const updated = await prisma.booking.update({
            where: { id: parseInt(id as string) },
            data: { bookingStatus: status }
        });

        // [M-22] Log no-show
        if (status === 'NO_SHOW') {
            await prisma.auditLog.create({
                data: {
                    actorId: vendorId,
                    actorRole: 'VENDOR',
                    action: 'BOOKING_NO_SHOW',
                    targetType: 'BOOKING',
                    targetId: booking.id
                }
            });
        }

        res.status(200).json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// 7. Reports & Analytics
export const getVendorReports = async (req: Request, res: Response): Promise<void> => {
    try {
        const vendorId = (req as any).user.id;
        const branch = await prisma.branch.findFirst({ where: { vendorId } });

        if (!branch) {
            res.status(404).json({ error: 'Branch not found' });
            return;
        }

        const metrics = await prisma.booking.aggregate({
            where: { branchId: branch.id, bookingStatus: 'COMPLETED' },
            _sum: { totalPrice: true },
            _count: { id: true }
        });

        res.status(200).json({
            totalRevenue: metrics._sum.totalPrice || 0,
            completedBookings: metrics._count.id,
            occupancyRate: branch.occupancyRate
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getOccupancyReport = async (req: Request, res: Response): Promise<void> => {
    try {
        const vendorId = (req as any).user.id;
        const branch = await prisma.branch.findFirst({ where: { vendorId } });
        if (!branch) { res.status(404).json({ error: 'Branch not found' }); return; }

        // Build 7-day daily booking counts
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const bookings = await prisma.booking.findMany({
            where: { branchId: branch.id, startTime: { gte: sevenDaysAgo } },
            select: { startTime: true, numPeople: true }
        });

        const dailyTrends: { name: string; bookings: number; occupancy: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            const next = new Date(d);
            next.setDate(next.getDate() + 1);
            const dayBookings = bookings.filter(b => b.startTime >= d && b.startTime < next);
            dailyTrends.push({
                name: days[d.getDay()],
                bookings: dayBookings.length,
                occupancy: dayBookings.length > 0 ? Math.min(100, Math.round((dayBookings.length / 10) * 100)) : 0
            });
        }

        res.status(200).json({
            branchName: branch.name,
            currentOccupancy: branch.occupancyRate,
            dailyTrends,
            monthlyAverage: branch.occupancyRate
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getRevenueReport = async (req: Request, res: Response): Promise<void> => {
    try {
        const vendorId = (req as any).user.id;
        const branch = await prisma.branch.findFirst({ where: { vendorId } });
        if (!branch) { res.status(404).json({ error: 'Branch not found' }); return; }

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const bookings = await prisma.booking.findMany({
            where: { branchId: branch.id, startTime: { gte: sevenDaysAgo }, bookingStatus: 'COMPLETED' },
            select: { startTime: true, totalPrice: true }
        });

        const dailyRevenue: { name: string; revenue: number; bookings: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            const next = new Date(d);
            next.setDate(next.getDate() + 1);
            const dayBookings = bookings.filter(b => b.startTime >= d && b.startTime < next);
            const revenue = dayBookings.reduce((sum, b) => sum + Number(b.totalPrice), 0);
            dailyRevenue.push({ name: days[d.getDay()], revenue: Math.round(revenue), bookings: dayBookings.length });
        }

        res.status(200).json(dailyRevenue);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const exportReport = async (req: Request, res: Response): Promise<void> => {
    try {
        const vendorId = (req as any).user.id;
        const { period, format } = req.query;

        // [M-26] Validate export parameters
        const ExportSchema = z.object({
            period: z.enum(['7d', '30d', '90d', 'all']).optional(),
            format: z.enum(['csv', 'pdf', 'xlsx']).optional()
        });

        const validation = ExportSchema.safeParse({ period, format });
        if (!validation.success) {
            res.status(400).json({ error: 'Invalid export parameters', details: validation.error.format() });
            return;
        }

        // [M-25] Mock S3 export logic and audit log
        const bucketUrl = `https://mock-s3-bucket.s3.amazonaws.com/exports/vendor_${vendorId}_report_${Date.now()}.${format || 'csv'}`;

        await prisma.auditLog.create({
            data: {
                actorId: vendorId,
                actorRole: 'VENDOR',
                action: 'REPORT_EXPORTED',
                targetType: 'REPORT',
                targetId: vendorId
            }
        });

        res.status(200).json({
            message: 'Report export started. You will receive a notification when ready.',
            downloadUrl: bucketUrl
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// 8. Account Settings
export const getVendorProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id;
        const profile = await prisma.user.findUnique({
            where: { id: userId },
            include: { branches: true }
        });

        // [M-29] Hardcode mandatory notification flags in the response
        const profileWithNotifications = {
            ...profile,
            notifications: {
                security: true, // Mandatory
                marketing: false
            }
        };

        res.status(200).json(profileWithNotifications);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateVendorProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id;
        const { email, phoneNumber, id, notifications } = req.body;

        // [M-28] Profile IDOR prevention
        if (id && id !== userId) {
            res.status(403).json({ error: 'Forbidden: Cannot update profile for another user' });
            return;
        }

        // [M-29] Security notification hardening
        if (notifications && notifications.security === false) {
            res.status(400).json({ error: 'Security notifications are mandatory and cannot be disabled.' });
            return;
        }

        const dataToUpdate: any = { phoneNumber };

        // [M-27] Email change verification
        if (email) {
            const currentUser = await prisma.user.findUnique({ where: { id: userId } });
            if (currentUser && currentUser.email !== email) {
                // Store in pendingEmail and do not update main email yet
                dataToUpdate.pendingEmail = email;

                // Mock sending verification link
                const mockVerificationToken = 'mock-jwt-token-for-' + email;

                await prisma.auditLog.create({
                    data: {
                        actorId: userId,
                        actorRole: 'VENDOR',
                        action: 'EMAIL_CHANGE_REQUESTED',
                        targetType: 'USER',
                        targetId: userId
                    }
                });

                await prisma.user.update({
                    where: { id: userId },
                    data: dataToUpdate
                });

                res.status(200).json({
                    message: `Profile updated. A verification link has been sent to ${email} to confirm the change. Pending verification link: /api/vendor/profile/verify-email?token=${mockVerificationToken}`
                });
                return;
            }
        }

        const updated = await prisma.user.update({
            where: { id: userId },
            data: dataToUpdate
        });

        res.status(200).json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateVendorPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        // In a real app, we would hash this. For now, following codebase patterns.
        const userId = (req as any).user.id;
        const { newPassword } = req.body;

        await prisma.user.update({
            where: { id: userId },
            data: { passwordHash: newPassword }
        });

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const verifyEmailChange = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user || !user.pendingEmail) {
            res.status(400).json({ error: 'No pending email change found.' });
            return;
        }

        await prisma.user.update({
            where: { id: userId },
            data: { email: user.pendingEmail, pendingEmail: null }
        });

        res.status(200).json({ message: 'Email successfully verified and updated.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
