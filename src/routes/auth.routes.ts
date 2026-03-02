import { Router } from 'express';
import { register, login, verifyOtp } from '../controllers/auth.controller';
import rateLimit from 'express-rate-limit';
import { body } from 'express-validator';

const router = Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' }
});

const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { error: 'Too many accounts created from this IP, please try again after an hour' }
});

const validateRegister = [
    body('email').optional().isEmail().normalizeEmail(),
    body('phoneNumber').optional().isMobilePhone('any'),
    body('password').optional().isLength({ min: 6 }),
    body('fullName').optional().trim().escape()
];

const validateLogin = [
    body('email').optional().isEmail().normalizeEmail(),
    body('phoneNumber').optional().isMobilePhone('any'),
    body('password').optional().notEmpty()
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
