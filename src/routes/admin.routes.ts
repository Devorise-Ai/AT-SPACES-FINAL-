import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin Portal management endpoints
 */

const router = Router();

// Apply authentication and admin authorization to all admin routes
router.use(authenticate);
router.use(authorize(['ADMIN']));

// ===========================
// 1. DASHBOARD OVERVIEW
// ===========================

/**
 * @swagger
 * /api/admin/overview:
 *   get:
 *     summary: Get admin dashboard overview
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard metrics (bookings today, occupancy, active branches, total vendors, pending requests)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
const noCache = (req: any, res: any, next: any) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
};

router.get('/overview', noCache, adminController.getDashboardOverview);

// ===========================
// 2. BRANCH MANAGEMENT
// ===========================

/**
 * @swagger
 * /api/admin/branches:
 *   get:
 *     summary: Get all branches
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, SUSPENDED, UNDER_REVIEW]
 *         description: Filter branches by status
 *     responses:
 *       200:
 *         description: List of branches
 */
router.get('/branches', adminController.getBranches);

/**
 * @swagger
 * /api/admin/branches/{id}:
 *   get:
 *     summary: Get branch details with statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Branch details
 *       404:
 *         description: Branch not found
 */
router.get('/branches/:id', adminController.getBranchDetails);

/**
 * @swagger
 * /api/admin/branches/{id}/status:
 *   patch:
 *     summary: Update branch status (Activate / Suspend)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, SUSPENDED, UNDER_REVIEW]
 *     responses:
 *       200:
 *         description: Branch status updated
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Branch not found
 */
router.patch('/branches/:id/status', adminController.updateBranchStatus);

// ===========================
// 3. VENDOR MANAGEMENT
// ===========================

/**
 * @swagger
 * /api/admin/vendors:
 *   get:
 *     summary: Get all vendors
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, PENDING, SUSPENDED]
 *         description: Filter vendors by status
 *     responses:
 *       200:
 *         description: List of vendors
 */
router.get('/vendors', adminController.getVendors);

/**
 * @swagger
 * /api/admin/vendors/{id}:
 *   get:
 *     summary: Get vendor details with reliability indicators
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Vendor details
 *       404:
 *         description: Vendor not found
 */
router.get('/vendors/:id', adminController.getVendorDetails);

/**
 * @swagger
 * /api/admin/vendors/{id}/status:
 *   patch:
 *     summary: Update vendor status (Approve / Suspend)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, SUSPENDED, PENDING]
 *     responses:
 *       200:
 *         description: Vendor status updated (branches auto-updated)
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Vendor not found
 */
router.patch('/vendors/:id/status', adminController.updateVendorStatus);

// ===========================
// 4. APPROVAL REQUESTS
// ===========================

/**
 * @swagger
 * /api/admin/requests:
 *   get:
 *     summary: Get approval requests
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [CAPACITY_CHANGE]
 *     responses:
 *       200:
 *         description: List of approval requests
 */
router.get('/requests', adminController.getPendingRequests);

/**
 * @swagger
 * /api/admin/requests/{id}:
 *   get:
 *     summary: Get approval request details
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Approval request details
 *       404:
 *         description: Request not found
 */
router.get('/requests/:id', adminController.getRequestDetails);

/**
 * @swagger
 * /api/admin/requests/{id}/review:
 *   post:
 *     summary: Approve or reject an approval request
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               decision:
 *                 type: string
 *                 enum: [APPROVED, REJECTED]
 *               rejectionReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Request processed (capacity auto-updated on approval)
 *       400:
 *         description: Invalid decision or missing rejection reason
 *       404:
 *         description: Request not found
 */
router.post('/requests/:id/review', adminController.handleApprovalRequest);

// ===========================
// 5. ANALYTICS
// ===========================

/**
 * @swagger
 * /api/admin/analytics/occupancy:
 *   get:
 *     summary: Get occupancy analytics by city
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Occupancy data grouped by city
 */
router.get('/analytics/occupancy', adminController.getOccupancyAnalytics);

/**
 * @swagger
 * /api/admin/analytics/services:
 *   get:
 *     summary: Get service usage distribution
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Service distribution (Hot Desk, Private Office, Meeting Room percentages)
 */
router.get('/analytics/services', adminController.getServiceDistribution);

/**
 * @swagger
 * /api/admin/analytics/performance:
 *   get:
 *     summary: Get performance indicators
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Peak hours, busiest days, average duration, repeat customer %
 */
router.get('/analytics/performance', adminController.getPerformanceIndicators);

/**
 * @swagger
 * /api/admin/analytics/vendors:
 *   get:
 *     summary: Get vendor performance comparison
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vendor performance sorted by total bookings
 */
router.get('/analytics/vendors', adminController.getVendorPerformance);

/**
 * @swagger
 * /api/admin/reports/export:
 *   get:
 *     summary: Export analytics report
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, pdf, xlsx]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Report export initiated
 */
router.get('/reports/export', adminController.exportAnalyticsReport);

// ===========================
// 6. ADMIN SETTINGS
// ===========================

/**
 * @swagger
 * /api/admin/profile:
 *   get:
 *     summary: Get admin profile
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin profile details
 * @swagger
 * /api/admin/profile/{id}:
 *   put:
 *     summary: Update admin profile (M-08 IDOR Check)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               ownerName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.get('/profile', adminController.getAdminProfile);
router.put('/profile/:id', adminController.updateAdminProfile);

/**
 * @swagger
 * /api/admin/permissions/{id}:
 *   patch:
 *     summary: Update admin permissions (M-07 Escalation Block)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               permissions:
 *                 type: string
 *     responses:
 *       200:
 *         description: Permissions updated
 */
router.patch('/permissions/:id', adminController.updateAdminPermissions);

/**
 * @swagger
 * /api/admin/profile/password:
 *   patch:
 *     summary: Update admin password
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated
 *       401:
 *         description: Current password incorrect
 */
router.patch('/profile/password', adminController.updateAdminPassword);

/**
 * @swagger
 * /api/admin/security/logs:
 *   get:
 *     summary: View security event logs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: List of security events
 */
router.get('/security/logs', adminController.getSecurityLogs);

/**
 * @swagger
 * /api/admin/audit-log:
 *   get:
 *     summary: View immutable audit logs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Paginated list of audit logs
 *       403:
 *         description: Forbidden - requires super_admin
 */
router.get('/audit-log', authorize(['super_admin']), adminController.getAuditLogsHandler);

export default router;
