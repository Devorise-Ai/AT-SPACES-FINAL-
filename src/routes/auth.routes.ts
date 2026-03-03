import { Router } from 'express';
import { register, login, verifyOtp, logout } from '../controllers/auth.controller';
import rateLimit from 'express-rate-limit';
import { body } from 'express-validator';
import helmet from 'helmet';

const router = Router();

// [M-03] Vendor login protection (lockout, rate limit)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login requests per `window`
    message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

// [M-01] Strong registration requirements (rate limit)
const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 signup requests per `window`
    message: { error: 'Too many accounts created from this IP, please try again after an hour' },
    standardHeaders: true,
    legacyHeaders: false,
});

// [M-01] Strong registration requirements (fields, format)
const validateRegister = [
    body('email').optional().isEmail().normalizeEmail(),
    body('phoneNumber').optional().isMobilePhone('any'),
    body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    body('role').optional().isIn(['CUSTOMER', 'VENDOR', 'ADMIN']).withMessage('Invalid role'),
    // Vendor specific fields validation
    body('businessName').if(body('role').equals('VENDOR')).notEmpty().trim().escape().withMessage('Business name is required for vendors'),
    body('tradeLicenseNumber').if(body('role').equals('VENDOR')).notEmpty().trim().escape().withMessage('Trade license number is required for vendors'),
    body('ownerName').if(body('role').equals('VENDOR')).notEmpty().trim().escape().withMessage('Owner name is required for vendors'),
    body('branchAddress').if(body('role').equals('VENDOR')).notEmpty().trim().escape().withMessage('Branch address is required for vendors'),
    body('captchaToken').notEmpty().withMessage('CAPTCHA required')
];

const validateLogin = [
    body('email').optional().isEmail().normalizeEmail(),
    body('phoneNumber').optional().isMobilePhone('any'),
    body('password').optional().notEmpty(),
    // body('captchaToken').optional().notEmpty()
];

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 */
router.post('/register', signupLimiter, validateRegister, register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in to an existing account
 *     tags: [Authentication]
 */
router.post('/login', loginLimiter, validateLogin, login);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Log out out a user
 *     tags: [Authentication]
 */
router.post('/logout', logout);

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP code
 *     tags: [Authentication]
 */
router.post('/verify-otp', loginLimiter, [
    body('phoneNumber').isMobilePhone('any'),
    body('otpCode').isLength({ min: 4, max: 6 }).isNumeric()
], verifyOtp);

export default router;
