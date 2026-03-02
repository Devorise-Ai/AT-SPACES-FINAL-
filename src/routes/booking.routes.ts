import { Router } from 'express';
import { checkAvailability, createBooking, getMyBookings, cancelBooking, getBookingCalendar, getBookingMap } from '../controllers/booking.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Public/Authentication-agnostic route for checking availability
/**
 * @swagger
 * /api/bookings/check:
 *   post:
 *     summary: Check availability of a space
 *     tags: [Bookings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - branchId
 *               - startTime
 *               - endTime
 *             properties:
 *               branchId:
 *                 type: integer
 *               startTime:
 *                 type: string
 *               endTime:
 *                 type: string
 *     responses:
 *       200:
 *         description: Availability status
 */
router.post('/check', checkAvailability);

// Protected routes
router.use(authenticate);

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create a new booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - branchId
 *               - serviceId
 *               - startTime
 *               - endTime
 *             properties:
 *               branchId:
 *                 type: integer
 *               serviceId:
 *                 type: integer
 *               startTime:
 *                 type: string
 *               endTime:
 *                 type: string
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Validation error
 */
router.post('/', createBooking);

/**
 * @swagger
 * /api/bookings/my:
 *   get:
 *     summary: Get all bookings for the current user
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user bookings
 */
router.get('/my', getMyBookings);

/**
 * @swagger
 * /api/bookings/{id}/cancel:
 *   post:
 *     summary: Cancel a booking
 *     tags: [Bookings]
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
 *         description: Booking cancelled
 *       404:
 *         description: Booking not found
 */
router.post('/:id/cancel', cancelBooking);

/**
 * @swagger
 * /api/bookings/{id}/calendar:
 *   get:
 *     summary: Download booking ICS calendar file
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.get('/:id/calendar', getBookingCalendar);

/**
 * @swagger
 * /api/bookings/{id}/map:
 *   get:
 *     summary: Get directions URL for booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.get('/:id/map', getBookingMap);

export default router;
