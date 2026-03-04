import { prisma } from './prisma';

export interface AuditLogParams {
    actorId: number;
    actorRole: string;
    action: string;
    targetType: string;
    targetId: number;
    oldValue?: any;
    newValue?: any;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * M-11: Immutable Audit Log
 * Writes an immutable audit entry to the database. Application code only calls this function
 * and should never update/delete these records.
 */
export const writeAuditLog = async (params: AuditLogParams): Promise<void> => {
    try {
        await prisma.auditLog.create({
            data: {
                actorId: params.actorId,
                actorRole: params.actorRole,
                action: params.action,
                targetType: params.targetType,
                targetId: params.targetId,
                oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null,
                newValue: params.newValue ? JSON.stringify(params.newValue) : null,
                ipAddress: params.ipAddress || null,
                userAgent: params.userAgent || null,
            }
        });
    } catch (error) {
        console.error('Failed to write audit log:', error);
        // Do not throw here to prevent blocking main business operations due to logging failure
    }
};

/**
 * M-11: Expose Pagination and filters
 * This function retrieves audit logs securely with pagination and date filters.
 */
export const getAuditLogs = async (
    page: number = 1,
    limit: number = 50,
    startDate?: Date,
    endDate?: Date
) => {
    const whereClause: any = {};

    if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt.gte = startDate;
        if (endDate) whereClause.createdAt.lte = endDate;
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        }),
        prisma.auditLog.count({ where: whereClause })
    ]);

    return {
        data: logs.map(log => ({
            ...log,
            oldValue: log.oldValue ? JSON.parse(log.oldValue) : null,
            newValue: log.newValue ? JSON.parse(log.newValue) : null,
        })),
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
};
