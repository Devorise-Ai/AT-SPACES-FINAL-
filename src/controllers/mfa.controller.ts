import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import { writeAuditLog } from '../utils/audit.logger';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// Setup MFA: Generate secret and return QR code
export const generateMfaSecret = async (req: Request, res: Response): Promise<void> => {
    try {
        const adminId = (req as any).user.id;

        const admin = await prisma.user.findUnique({ where: { id: adminId } });
        if (!admin) {
            res.status(404).json({ error: 'Admin not found' });
            return;
        }

        if (admin.mfaEnabled) {
            res.status(400).json({ error: 'MFA is already enabled' });
            return;
        }

        const secret = authenticator.generateSecret();
        const otpauthUrl = authenticator.keyuri(admin.email || 'Admin', 'AT Spaces Admin Portal', secret);

        // Save secret temporarily until verified
        await prisma.user.update({
            where: { id: adminId },
            data: { mfaSecret: secret }
        });

        const qrCodeUrl = await qrcode.toDataURL(otpauthUrl);

        res.status(200).json({
            secret,
            qrCodeUrl,
            message: 'Scan the QR code with your authenticator app and verify to fully enable MFA.'
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// Verify MFA to complete setup
export const verifyAndEnableMfa = async (req: Request, res: Response): Promise<void> => {
    try {
        const adminId = (req as any).user.id;
        const { token } = req.body;

        const admin = await prisma.user.findUnique({ where: { id: adminId } });
        if (!admin || !admin.mfaSecret) {
            res.status(400).json({ error: 'MFA setup not initiated' });
            return;
        }

        const isValid = authenticator.verify({ token, secret: admin.mfaSecret });
        if (!isValid) {
            res.status(400).json({ error: 'Invalid verification code' });
            return;
        }

        // Generate 10 backup codes
        const backupCodes = Array.from({ length: 10 }, () => crypto.randomBytes(4).toString('hex'));
        const hashedCodes = await Promise.all(backupCodes.map(code => bcrypt.hash(code, 10)));

        await prisma.user.update({
            where: { id: adminId },
            data: {
                mfaEnabled: true,
                mfaBackupCodes: JSON.stringify(hashedCodes)
            }
        });

        await writeAuditLog({
            actorId: adminId,
            actorRole: admin.role,
            action: 'MFA_ENABLED',
            targetType: 'USER',
            targetId: admin.id,
            ipAddress: req.ip || 'unknown'
        });

        res.status(200).json({
            message: 'MFA successfully enabled',
            backupCodes // Show only once
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// Disable MFA (M-10)
export const disableMfa = async (req: Request, res: Response): Promise<void> => {
    try {
        const adminId = (req as any).user.id;
        const { password, token } = req.body;

        const admin = await prisma.user.findUnique({ where: { id: adminId } });
        if (!admin) {
            res.status(404).json({ error: 'Admin not found' });
            return;
        }

        const isMatch = await bcrypt.compare(password, admin.passwordHash || '');
        if (!isMatch) {
            res.status(401).json({ error: 'Invalid password' });
            return;
        }

        const isValid = authenticator.verify({ token, secret: admin.mfaSecret || '' });
        if (!isValid) {
            res.status(400).json({ error: 'Invalid authenticator code' });
            return;
        }

        await prisma.user.update({
            where: { id: adminId },
            data: {
                mfaEnabled: false,
                mfaSecret: null,
                mfaBackupCodes: null
            }
        });

        await writeAuditLog({
            actorId: adminId,
            actorRole: admin.role,
            action: 'MFA_DISABLED',
            targetType: 'USER',
            targetId: admin.id,
            ipAddress: req.ip || 'unknown'
        });

        res.status(200).json({ message: 'MFA successfully disabled' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
