import { Router } from 'express';
import { register, login, verifyOtp, logout, requestPasswordReset, resetPassword, verifyMfa } from '../controllers/auth.controller';
import rateLimit from 'express-rate-limit';
import { body } from 'express-validator';
import helmet from 'helmet';

const router = Router();

// Login protection policy (applies to CUSTOMER, VENDOR, ADMIN logins)
// 1) Allow 5 attempts per minute (burst protection)
const loginBurstLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    message: { error: 'Too many login attempts. Please wait 1 minute before trying again.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
});

// 2) Escalation block for repeated failures
const loginEscalationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { error: 'Too many failed logins. Your IP is temporarily blocked for 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
});

// 3) Hard block: 20+ failed attempts in 1 hour
const loginHourlyBlockLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    message: { error: 'Too many failed login attempts. Your IP is blocked for 1 hour.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
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
router.post('/login', loginBurstLimiter, loginEscalationLimiter, loginHourlyBlockLimiter, validateLogin, login);

/**
 * @swagger
 * /api/auth/verify-mfa:
 *   post:
 *     summary: Complete login with preAuthToken and TOTP code
 *     tags: [Authentication]
 */
router.post('/verify-mfa', loginBurstLimiter, loginEscalationLimiter, loginHourlyBlockLimiter, verifyMfa);

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
router.post('/verify-otp', loginBurstLimiter, loginEscalationLimiter, loginHourlyBlockLimiter, [
    body('phoneNumber').isMobilePhone('any'),
    body('otpCode').isLength({ min: 4, max: 6 }).isNumeric()
], verifyOtp);

const resetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // Limit each IP to 3 requests
    message: { error: 'Too many password reset requests from this IP' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * @swagger
 * /api/auth/request-reset:
 *   post:
 *     summary: Request a password reset link
 *     tags: [Authentication]
 */
router.post('/request-reset', resetLimiter, requestPasswordReset);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using the emailed token
 *     tags: [Authentication]
 */
router.post('/reset-password', resetLimiter, resetPassword);

export default router;
