import { Router } from 'express';
import { generateMfaSecret, verifyAndEnableMfa, disableMfa } from '../controllers/mfa.controller';
import { authorize } from '../middlewares/auth.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

const mfaLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { error: 'Too many MFA requests from this IP' }
});

router.use(authorize(['ADMIN', 'SUPER_ADMIN']));
router.use(mfaLimiter);

/**
 * @swagger
 * /api/admin/mfa/setup:
 *   post:
 *     summary: Generate MFA secret and QR code
 *     tags: [MFA]
 *     security:
 *       - bearerAuth: []
 */
router.post('/setup', generateMfaSecret);

/**
 * @swagger
 * /api/admin/mfa/enable:
 *   post:
 *     summary: Verify TOTP and enable MFA
 *     tags: [MFA]
 *     security:
 *       - bearerAuth: []
 */
router.post('/enable', verifyAndEnableMfa);

/**
 * @swagger
 * /api/admin/mfa/disable:
 *   post:
 *     summary: Disable MFA safely
 *     tags: [MFA]
 *     security:
 *       - bearerAuth: []
 */
router.post('/disable', disableMfa);

export default router;
