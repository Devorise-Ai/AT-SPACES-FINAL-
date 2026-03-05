import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { getAuditLogs, writeAuditLog } from '../utils/audit.logger';
import { sendEmail } from '../utils/email.service';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// ============================================================
// 1. DASHBOARD OVERVIEW
// ============================================================

export const getDashboardOverview = async (req: Request, res: Response): Promise<void> => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const totalBookingsToday = await prisma.booking.count({
            where: { startTime: { gte: today, lt: tomorrow } }
        });

        const activeBranches = await prisma.branch.findMany({
            where: { status: 'ACTIVE' }
        });
        const overallOccupancy = activeBranches.length > 0
            ? activeBranches.reduce((sum, b) => sum + b.occupancyRate, 0) / activeBranches.length
            : 0;

        const activeBranchCount = activeBranches.length;

        const totalVendors = await prisma.user.count({
            where: { role: 'VENDOR' }
        });

        const pendingRequests = await prisma.approvalRequest.count({
            where: { status: 'PENDING' }
        });

        res.status(200).json({
            totalBookingsToday,
            overallOccupancy: Math.round(overallOccupancy * 100) / 100,
            activeBranchCount,
            totalVendors,
            pendingRequests
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};


// ============================================================
// 2. BRANCH MANAGEMENT
// ============================================================

export const getBranches = async (req: Request, res: Response): Promise<void> => {
    try {
        const { status } = req.query;

        const where: any = {};
        if (status && typeof status === 'string') {
            where.status = status.toUpperCase();
        }

        const branches = await prisma.branch.findMany({
            where,
            include: {
                vendor: true,
                vendorServices: {
                    include: { service: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const result = branches.map(b => ({
            id: b.id,
            name: b.name,
            location: b.location,
            status: b.status,
            occupancyRate: b.occupancyRate,
            createdAt: b.createdAt,
            vendor: {
                id: b.vendor.id,
                email: b.vendor.email,
                businessName: b.vendor.businessName,
                ownerName: b.vendor.ownerName
            },
            services: b.vendorServices.map(vs => ({
                id: vs.id,
                serviceName: vs.service.name,
                capacity: vs.capacity,
                availableCapacity: vs.availableCapacity
            }))
        }));

        res.status(200).json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getBranchDetails = async (req: Request, res: Response): Promise<void> => {
    try {
        const userRole = (req as any).user.role;
        // M-05: Enforce admin role explicitly
        if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Access denied: Admin role required' });
            return;
        }

        const id = parseInt(req.params.id as string);

        const branch = await prisma.branch.findUnique({
            where: { id },
            include: {
                vendor: true,
                vendorServices: {
                    include: {
                        service: true,
                        features: { include: { feature: true } }
                    }
                },
                facilities: {
                    include: { facility: true }
                },
                bookings: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    include: { customer: true }
                }
            }
        });

        if (!branch) {
            res.status(404).json({ error: 'Branch not found' });
            return;
        }

        const totalBookings = await prisma.booking.count({
            where: { branchId: branch.id }
        });
        const completedBookings = await prisma.booking.count({
            where: { branchId: branch.id, bookingStatus: 'COMPLETED' }
        });
        const revenue = await prisma.booking.aggregate({
            where: { branchId: branch.id, bookingStatus: 'COMPLETED' },
            _sum: { totalPrice: true }
        });

        res.status(200).json({
            ...branch,
            statistics: {
                totalBookings,
                completedBookings,
                totalRevenue: revenue._sum.totalPrice || 0
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateBranchStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id as string);
        const { status } = req.body;
        const adminId = (req as any).user.id;
        const adminRole = (req as any).user.role;

        // M-04: Assert admin role
        if (adminRole !== 'ADMIN' && adminRole !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Access denied: Admin role required to change branch state' });
            return;
        }

        const validStatuses = ['ACTIVE', 'SUSPENDED', 'UNDER_REVIEW'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
            return;
        }

        const branch = await prisma.branch.findUnique({ where: { id } });
        if (!branch) {
            res.status(404).json({ error: 'Branch not found' });
            return;
        }

        const updated = await prisma.branch.update({
            where: { id },
            data: { status }
        });

        // M-04: Log to immutable AuditLog via helper
        await writeAuditLog({
            actorId: adminId,
            actorRole: adminRole,
            action: `BRANCH_STATUS_${status}`,
            targetType: 'BRANCH',
            targetId: branch.id,
            oldValue: { status: branch.status },
            newValue: { status },
            ipAddress: req.ip || 'unknown'
        });

        res.status(200).json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};


// ============================================================
// 3. VENDOR MANAGEMENT
// ============================================================

export const getVendors = async (req: Request, res: Response): Promise<void> => {
    try {
        const { status } = req.query;

        const where: any = { role: 'VENDOR' };
        if (status && typeof status === 'string') {
            where.status = status.toUpperCase();
        }

        const vendors = await prisma.user.findMany({
            where,
            include: {
                branches: true
            },
            orderBy: { createdAt: 'desc' }
        });

        const result = vendors.map(v => ({
            id: v.id,
            email: v.email,
            phoneNumber: v.phoneNumber,
            businessName: v.businessName,
            ownerName: v.ownerName,
            tradeLicenseNumber: v.tradeLicenseNumber,
            status: v.status,
            createdAt: v.createdAt,
            branches: v.branches.map(b => ({
                id: b.id,
                name: b.name,
                location: b.location,
                status: b.status
            }))
        }));

        res.status(200).json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getVendorDetails = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id as string);

        const vendor = await prisma.user.findFirst({
            where: { id, role: 'VENDOR' },
            include: {
                branches: {
                    include: {
                        vendorServices: { include: { service: true } },
                        facilities: { include: { facility: true } }
                    }
                }
            }
        });

        if (!vendor) {
            res.status(404).json({ error: 'Vendor not found' });
            return;
        }

        const vendorBranchIds = vendor.branches.map(b => b.id);
        const totalBookings = await prisma.booking.count({
            where: { branchId: { in: vendorBranchIds } }
        });
        const completedBookings = await prisma.booking.count({
            where: { branchId: { in: vendorBranchIds }, bookingStatus: 'COMPLETED' }
        });
        const noShowBookings = await prisma.booking.count({
            where: { branchId: { in: vendorBranchIds }, bookingStatus: 'NO_SHOW' }
        });

        res.status(200).json({
            id: vendor.id,
            email: vendor.email,
            phoneNumber: vendor.phoneNumber,
            businessName: vendor.businessName,
            ownerName: vendor.ownerName,
            tradeLicenseNumber: vendor.tradeLicenseNumber,
            branchAddress: vendor.branchAddress,
            status: vendor.status,
            createdAt: vendor.createdAt,
            branches: vendor.branches,
            reliabilityIndicators: {
                totalBookings,
                completedBookings,
                noShowBookings,
                completionRate: totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateVendorStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id as string);
        const { status } = req.body;
        const adminId = (req as any).user.id;
        const adminRole = (req as any).user.role;

        // M-06: Prevent Self-Approval
        if (adminId === id) {
            await writeAuditLog({
                actorId: adminId,
                actorRole: adminRole,
                action: 'SELF_APPROVAL_ATTEMPT',
                targetType: 'USER',
                targetId: id,
                ipAddress: req.ip || 'unknown'
            });
            res.status(403).json({ error: 'Admins cannot approve or suspend their own vendor accounts' });
            return;
        }

        const validStatuses = ['ACTIVE', 'SUSPENDED', 'PENDING'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
            return;
        }

        const vendor = await prisma.user.findFirst({
            where: { id, role: 'VENDOR' }
        });

        if (!vendor) {
            res.status(404).json({ error: 'Vendor not found' });
            return;
        }

        const updated = await prisma.user.update({
            where: { id },
            data: { status }
        });

        await writeAuditLog({
            actorId: adminId,
            actorRole: adminRole,
            action: `VENDOR_STATUS_${status}`,
            targetType: 'USER',
            targetId: id,
            oldValue: { status: vendor.status },
            newValue: { status },
            ipAddress: req.ip || 'unknown'
        });

        // If activating a vendor, also activate their branches under review
        if (status === 'ACTIVE') {
            await prisma.branch.updateMany({
                where: { vendorId: id, status: 'UNDER_REVIEW' },
                data: { status: 'ACTIVE' }
            });
        }

        // If suspending a vendor, suspend their active branches too
        if (status === 'SUSPENDED') {
            await prisma.branch.updateMany({
                where: { vendorId: id, status: 'ACTIVE' },
                data: { status: 'SUSPENDED' }
            });
        }

        res.status(200).json({
            message: `Vendor status updated to ${status}`,
            vendor: updated
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};


// ============================================================
// 4. APPROVAL REQUESTS
// ============================================================

export const getPendingRequests = async (req: Request, res: Response): Promise<void> => {
    try {
        const { type, status: statusFilter } = req.query;

        const where: any = {};
        if (statusFilter && typeof statusFilter === 'string') {
            where.status = statusFilter.toUpperCase();
        } else {
            where.status = 'PENDING';
        }
        if (type && typeof type === 'string') {
            where.type = type.toUpperCase();
        }

        const requests = await prisma.approvalRequest.findMany({
            where,
            include: {
                vendor: true,
                branch: true,
                service: true
            },
            orderBy: { createdAt: 'desc' }
        });

        const result = requests.map(r => ({
            id: r.id,
            type: r.type,
            status: r.status,
            payload: r.payload,
            rejectionReason: r.rejectionReason,
            createdAt: r.createdAt,
            vendor: r.vendor ? {
                id: r.vendor.id,
                email: r.vendor.email,
                businessName: r.vendor.businessName,
                ownerName: r.vendor.ownerName
            } : null,
            branch: r.branch ? {
                id: r.branch.id,
                name: r.branch.name,
                location: r.branch.location
            } : null,
            service: r.service ? {
                id: r.service.id,
                name: r.service.name
            } : null
        }));

        res.status(200).json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getRequestDetails = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id as string);

        const request = await prisma.approvalRequest.findUnique({
            where: { id },
            include: {
                vendor: true,
                branch: true,
                service: true,
                admin: true
            }
        });

        if (!request) {
            res.status(404).json({ error: 'Approval request not found' });
            return;
        }

        let parsedPayload = null;
        if (request.payload) {
            try { parsedPayload = JSON.parse(request.payload); } catch { }
        }

        res.status(200).json({
            id: request.id,
            type: request.type,
            status: request.status,
            payload: request.payload,
            payloadHash: request.payloadHash,
            rejectionReason: request.rejectionReason,
            createdAt: request.createdAt,
            parsedPayload,
            vendor: request.vendor ? {
                id: request.vendor.id,
                email: request.vendor.email,
                businessName: request.vendor.businessName,
                ownerName: request.vendor.ownerName
            } : null,
            branch: request.branch ? {
                id: request.branch.id,
                name: request.branch.name,
                location: request.branch.location
            } : null,
            service: request.service ? {
                id: request.service.id,
                name: request.service.name
            } : null,
            reviewedBy: request.admin ? {
                id: request.admin.id,
                email: request.admin.email
            } : null
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const handleApprovalRequest = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id as string);
        const { decision, rejectionReason } = req.body;
        const adminId = (req as any).user.id;

        if (!['APPROVED', 'REJECTED'].includes(decision)) {
            res.status(400).json({ error: 'Decision must be APPROVED or REJECTED' });
            return;
        }

        if (decision === 'REJECTED' && (!rejectionReason || rejectionReason.trim().length < 1)) {
            res.status(400).json({ error: 'Please provide a rejection reason' });
            return;
        }

        const request = await prisma.approvalRequest.findUnique({
            where: { id }
        });

        if (!request) {
            res.status(404).json({ error: 'Approval request not found' });
            return;
        }

        if (request.status !== 'PENDING') {
            res.status(400).json({ error: 'This request has already been processed' });
            return;
        }

        // Verify payload integrity using HMAC
        if (request.payloadHash && request.payload) {
            const computedHash = crypto.createHmac('sha256', process.env.HMAC_SECRET || 'secret')
                .update(request.payload)
                .digest('hex');
            if (computedHash !== request.payloadHash) {
                res.status(400).json({ error: 'Request payload integrity check failed. This request may have been tampered with.' });
                return;
            }
        }

        // Update request status
        const updated = await prisma.approvalRequest.update({
            where: { id },
            data: {
                status: decision,
                reviewedBy: adminId,
                rejectionReason: decision === 'REJECTED' ? rejectionReason : null
            }
        });

        // If approved AND it's a capacity change or feature addition, apply the change
        if (decision === 'APPROVED' && request.payload) {
            try {
                const payload = JSON.parse(request.payload);

                if (request.type === 'CAPACITY_CHANGE' && payload.proposedCapacity) {
                    // Use vendorServiceId from payload, fallback to finding by branch+service
                    let vsId = payload.vendorServiceId;
                    if (!vsId && request.branchId && request.serviceId) {
                        const vs = await prisma.vendorService.findFirst({
                            where: { branchId: request.branchId, serviceId: request.serviceId }
                        });
                        vsId = vs?.id;
                    }
                    if (vsId) {
                        await prisma.vendorService.update({
                            where: { id: vsId },
                            data: {
                                capacity: payload.proposedCapacity,
                                availableCapacity: payload.proposedCapacity
                            }
                        });
                    }
                }

                if (request.type === 'FEATURE_ADDITION' && payload.features && Array.isArray(payload.features)) {
                    // Use vendorServiceId from payload, fallback to finding by branch+service
                    let vsId = payload.vendorServiceId;
                    if (!vsId && request.branchId && request.serviceId) {
                        const vs = await prisma.vendorService.findFirst({
                            where: { branchId: request.branchId, serviceId: request.serviceId }
                        });
                        vsId = vs?.id;
                    }
                    if (vsId) {
                        for (const featureName of payload.features) {
                            if (typeof featureName !== 'string' || !featureName.trim()) continue;

                            // Find or create global feature
                            let feature = await prisma.feature.findFirst({
                                where: { name: featureName.trim() }
                            });

                            if (!feature) {
                                feature = await prisma.feature.create({
                                    data: { name: featureName.trim() }
                                });
                            }

                            // Link service feature
                            await prisma.serviceFeature.upsert({
                                where: {
                                    vendorServiceId_featureId: {
                                        vendorServiceId: vsId,
                                        featureId: feature.id
                                    }
                                },
                                update: { quantity: 1 },
                                create: {
                                    vendorServiceId: vsId,
                                    featureId: feature.id,
                                    quantity: 1
                                }
                            });
                        }
                    }
                }
            } catch (parseErr) {
                console.error('Failed to parse approval payload:', parseErr);
            }
        }

        // Audit log
        await prisma.auditLog.create({
            data: {
                actorId: adminId,
                actorRole: 'ADMIN',
                action: `REQUEST_${decision}`,
                targetType: 'APPROVAL_REQUEST',
                targetId: request.id
            }
        });

        res.status(200).json({
            message: `Request ${decision.toLowerCase()} successfully`,
            request: updated
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};


// ============================================================
// 5. ANALYTICS
// ============================================================

export const getOccupancyAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
        const branches = await prisma.branch.findMany({
            where: { status: 'ACTIVE' }
        });

        // Group by location (city)
        const byCity: Record<string, { branches: number; avgOccupancy: number; totalOccupancy: number }> = {};
        for (const branch of branches) {
            const city = branch.location || 'Unknown';
            if (!byCity[city]) {
                byCity[city] = { branches: 0, avgOccupancy: 0, totalOccupancy: 0 };
            }
            byCity[city].branches += 1;
            byCity[city].totalOccupancy += branch.occupancyRate;
        }

        const occupancyByCity = Object.entries(byCity).map(([city, data]) => ({
            city,
            branches: data.branches,
            avgOccupancy: Math.round((data.totalOccupancy / data.branches) * 100) / 100
        }));

        res.status(200).json({
            totalActiveBranches: branches.length,
            occupancyByCity,
            branches: branches.map(b => ({
                id: b.id,
                name: b.name,
                location: b.location,
                occupancyRate: b.occupancyRate
            }))
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getServiceDistribution = async (req: Request, res: Response): Promise<void> => {
    try {
        const services = await prisma.service.findMany({
            include: {
                vendorServices: {
                    include: {
                        bookings: true
                    }
                }
            }
        });

        const distribution = services.map(s => {
            const totalBookings = s.vendorServices.reduce((sum, vs) => sum + vs.bookings.length, 0);
            return {
                serviceId: s.id,
                serviceName: s.name,
                totalVendorServices: s.vendorServices.length,
                totalBookings
            };
        });

        const grandTotal = distribution.reduce((sum, d) => sum + d.totalBookings, 0);
        const withPercentage = distribution.map(d => ({
            ...d,
            percentage: grandTotal > 0 ? Math.round((d.totalBookings / grandTotal) * 100) : 0
        }));

        res.status(200).json({
            totalBookings: grandTotal,
            distribution: withPercentage
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getPerformanceIndicators = async (req: Request, res: Response): Promise<void> => {
    try {
        const allBookings = await prisma.booking.findMany({
            select: { startTime: true, duration: true, customerId: true }
        });

        // Compute peak hours
        const hourCounts: Record<number, number> = {};
        const dayCounts: Record<number, number> = {};
        for (const b of allBookings) {
            const hour = new Date(b.startTime).getHours();
            const day = new Date(b.startTime).getDay();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
            dayCounts[day] = (dayCounts[day] || 0) + 1;
        }

        const peakHours = Object.entries(hourCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([hour, count]) => ({ hour: parseInt(hour), bookings: count }));

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const busiestDays = Object.entries(dayCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([day, count]) => ({ day: dayNames[parseInt(day)], bookings: count }));

        // Average booking duration
        const avgDuration = allBookings.length > 0
            ? allBookings.reduce((sum, b) => sum + b.duration, 0) / allBookings.length
            : 0;

        // Repeat customer percentage
        const customerBookingCounts: Record<number, number> = {};
        for (const b of allBookings) {
            customerBookingCounts[b.customerId] = (customerBookingCounts[b.customerId] || 0) + 1;
        }
        const totalCustomers = Object.keys(customerBookingCounts).length;
        const repeatCustomers = Object.values(customerBookingCounts).filter(c => c > 1).length;

        res.status(200).json({
            totalBookings: allBookings.length,
            averageDuration: Math.round(avgDuration * 100) / 100,
            peakHours,
            busiestDays,
            customerMetrics: {
                totalCustomers,
                repeatCustomers,
                repeatPercentage: totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getVendorPerformance = async (req: Request, res: Response): Promise<void> => {
    try {
        const vendors = await prisma.user.findMany({
            where: { role: 'VENDOR', status: 'ACTIVE' },
            include: {
                branches: true
            }
        });

        const vendorPerformanceList = [];
        for (const v of vendors) {
            const branchIds = v.branches.map(b => b.id);
            const totalBookings = branchIds.length > 0
                ? await prisma.booking.count({ where: { branchId: { in: branchIds } } })
                : 0;
            const avgOccupancy = v.branches.length > 0
                ? v.branches.reduce((sum, b) => sum + b.occupancyRate, 0) / v.branches.length
                : 0;

            vendorPerformanceList.push({
                vendorId: v.id,
                businessName: v.businessName,
                email: v.email,
                branchCount: v.branches.length,
                totalBookings,
                avgOccupancy: Math.round(avgOccupancy * 100) / 100
            });
        }

        vendorPerformanceList.sort((a, b) => b.totalBookings - a.totalBookings);

        res.status(200).json(vendorPerformanceList);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const exportAnalyticsReport = async (req: Request, res: Response): Promise<void> => {
    try {
        const format = (req.query.format as string) || 'csv';
        const type = (req.query.type as string) || 'full';
        const adminId = (req as any).user.id;

        const validFormats = ['csv', 'pdf', 'xlsx'];
        const validTypes = ['full', 'occupancy', 'revenue', 'vendor'];
        if (!validFormats.includes(format)) {
            res.status(400).json({ error: `Invalid format. Must be one of: ${validFormats.join(', ')}` });
            return;
        }
        if (!validTypes.includes(type)) {
            res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
            return;
        }

        const adminRole = (req as any).user.role;
        const expiresStr = Math.floor((Date.now() + 5 * 60 * 1000) / 1000).toString(); // 5 min TTL
        const mockSignature = crypto.createHmac('sha256', process.env.HMAC_SECRET || 'secret').update(`s3_policy_${expiresStr}`).digest('hex');
        const exportUrl = `https://mock-s3-bucket.s3.amazonaws.com/exports/admin_${type}_report_${Date.now()}.${format}?X-Amz-Expires=${expiresStr}&X-Amz-Signature=${mockSignature}`;

        await writeAuditLog({
            actorId: adminId,
            actorRole: adminRole,
            action: 'ADMIN_REPORT_EXPORTED',
            targetType: 'SYSTEM',
            targetId: 0,
            ipAddress: req.ip || 'unknown',
            newValue: `Admin exported ${type} report in ${format} format`
        });

        res.status(200).json({
            message: 'Report export started. You will receive a notification when ready.',
            downloadUrl: exportUrl
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};


// ============================================================
// 6. ADMIN SETTINGS / PROFILE
// ============================================================

export const getAdminProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const adminId = (req as any).user.id;

        const admin = await prisma.user.findUnique({
            where: { id: adminId }
        });

        if (!admin) {
            res.status(404).json({ error: 'Admin profile not found' });
            return;
        }

        res.status(200).json({
            id: admin.id,
            email: admin.email,
            phoneNumber: admin.phoneNumber,
            ownerName: admin.ownerName,
            role: admin.role,
            status: admin.status,
            createdAt: admin.createdAt
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateAdminProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const adminId = (req as any).user.id;
        const adminRole = (req as any).user.role;
        const targetId = parseInt(req.params.id as string);
        const { email, phoneNumber, ownerName } = req.body;

        // M-08: Profile IDOR Prevention
        if (adminId !== targetId && adminRole !== 'SUPER_ADMIN') {
            await writeAuditLog({
                actorId: adminId,
                actorRole: adminRole,
                action: 'IDOR_PROFILE_EDIT_ATTEMPT',
                targetType: 'USER',
                targetId: targetId,
                ipAddress: req.ip || 'unknown'
            });
            res.status(403).json({ error: 'You can only edit your own profile' });
            return;
        }

        const updated = await prisma.user.update({
            where: { id: targetId },
            data: { email, phoneNumber, ownerName }
        });

        res.status(200).json({
            message: 'Profile updated successfully',
            profile: {
                id: updated.id,
                email: updated.email,
                phoneNumber: updated.phoneNumber,
                ownerName: updated.ownerName
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateAdminPermissions = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id as string);
        const { permissions } = req.body; // expected to be a role string like 'ADMIN' or 'SUPER_ADMIN'
        const adminId = (req as any).user.id;
        const adminRole = (req as any).user.role;

        // M-07: Require SUPER_ADMIN
        if (adminRole !== 'SUPER_ADMIN') {
            await writeAuditLog({
                actorId: adminId,
                actorRole: adminRole,
                action: 'UNAUTHORIZED_PERMISSION_CHANGE',
                targetType: 'USER',
                targetId: id,
                ipAddress: req.ip || 'unknown'
            });
            res.status(403).json({ error: 'Only super admins can change permissions' });
            return;
        }

        // M-07: Block self-modifications
        if (adminId === id) {
            await writeAuditLog({
                actorId: adminId,
                actorRole: adminRole,
                action: 'SELF_PERMISSION_ESCALATION_ATTEMPT',
                targetType: 'USER',
                targetId: id,
                ipAddress: req.ip || 'unknown'
            });
            res.status(403).json({ error: 'Super admins cannot change their own permissions' });
            return;
        }

        const targetAdmin = await prisma.user.findUnique({ where: { id } });
        if (!targetAdmin) {
            res.status(404).json({ error: 'Target admin not found' });
            return;
        }

        const updated = await prisma.user.update({
            where: { id },
            data: { role: permissions }
        });

        // M-07: Mock email alert
        if (targetAdmin.email) {
            await sendEmail(
                targetAdmin.email,
                'Permissions Updated',
                `Your permissions have been updated to ${permissions}`,
                `<p>Your admin role has been updated to <strong>${permissions}</strong>.</p>`
            );
        }

        await writeAuditLog({
            actorId: adminId,
            actorRole: adminRole,
            action: 'UPDATE_PERMISSIONS',
            targetType: 'USER',
            targetId: id,
            oldValue: { role: targetAdmin.role },
            newValue: { role: permissions },
            ipAddress: req.ip || 'unknown'
        });

        res.status(200).json({ message: 'Permissions updated successfully', newRole: permissions });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateAdminPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const adminId = (req as any).user.id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            res.status(400).json({ error: 'Both current and new password are required' });
            return;
        }

        if (newPassword.length < 8) {
            res.status(400).json({ error: 'New password must be at least 8 characters' });
            return;
        }

        const admin = await prisma.user.findUnique({ where: { id: adminId } });
        if (!admin) {
            res.status(404).json({ error: 'Admin not found' });
            return;
        }

        const isMatch = await bcrypt.compare(currentPassword, admin.passwordHash || '');
        if (!isMatch) {
            res.status(401).json({ error: 'Current password is incorrect' });
            return;
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: adminId },
            data: { passwordHash: hashedPassword }
        });

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getSecurityLogs = async (req: Request, res: Response): Promise<void> => {
    try {
        const take = parseInt(req.query.limit as string) || 50;

        const logs = await prisma.securityEvent.findMany({
            orderBy: { createdAt: 'desc' },
            take
        });

        res.status(200).json(logs);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getAuditLogsHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

        const logs = await getAuditLogs(page, limit, startDate, endDate);
        res.status(200).json(logs);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
