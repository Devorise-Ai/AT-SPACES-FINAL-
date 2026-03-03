import { Router } from 'express';
import * as vendorController from '../controllers/vendor.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

/**
 * @swagger
 * tags:
 *   name: Vendor
 *   description: Vendor Portal management endpoints
 */

const router = Router();

// Apply authentication and vendor authorization to all vendor routes
router.use(authenticate);
router.use(authorize(['VENDOR']));

// Middleware to prevent caching
const noCache = (req: any, res: any, next: any) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
};

/**
 * @swagger
 * /api/vendor/overview:
 *   get:
 *     summary: Get vendor dashboard overview
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard metrics
 *       401:
 *         description: Unauthorized
 */
router.get('/overview', noCache, vendorController.getVendorOverview);

// 2. Capacity Management
router.get('/services', vendorController.getVendorServices);
router.get('/capacity-requests', vendorController.getCapacityRequests);
router.post('/capacity-request', vendorController.requestCapacityChange);

// 3. Pricing Management
router.patch('/pricing/:vendorServiceId', vendorController.updateServicePricing);

// 4. Branch Facilities
router.get('/facilities', vendorController.getBranchFacilities);
router.patch('/facilities/:id', vendorController.updateBranchFacility);

// 5. Service Features
router.get('/services/:id/features', vendorController.getServiceFeatures);
router.put('/services/:id/features', vendorController.updateServiceFeature);

// 6. Bookings Management
router.get('/bookings', vendorController.getVendorBookings);
router.get('/bookings/:id', vendorController.getBookingById);
router.patch('/bookings/:id/status', vendorController.updateBookingStatus);

// 7. Reports & Analytics
router.get('/reports/overview', vendorController.getVendorReports);
router.get('/reports/occupancy', vendorController.getOccupancyReport);
router.get('/reports/revenue', vendorController.getRevenueReport);
router.get('/reports/export', vendorController.exportReport);

/**
 * @swagger
 * /api/vendor/profile:
 *   get:
 *     summary: Get vendor profile
 *     tags: [Vendor]
 *     responses:
 *       200:
 *         description: Vendor profile details
 *   put:
 *     summary: Update vendor profile
 *     tags: [Vendor]
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
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.get('/profile', vendorController.getVendorProfile);
router.put('/profile', vendorController.updateVendorProfile);

/**
 * @swagger
 * /api/vendor/profile/password:
 *   patch:
 *     summary: Update vendor password
 *     tags: [Vendor]
 *     responses:
 *       200:
 *         description: Password updated
 */
router.patch('/profile/password', vendorController.updateVendorPassword);
router.get('/profile/verify-email', vendorController.verifyEmailChange);

export default router;
