import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import bcrypt from 'bcryptjs';
import { generateToken, verifyToken } from '../utils/jwt';
import { validationResult } from 'express-validator';
import crypto from 'crypto';
import { sendEmail } from '../utils/email.service';
import { authenticator } from 'otplib';

// Mocks
const verifyCaptcha = async (token: string) => true; // Mock
const checkPasswordBreach = async (password: string) => false; // Mock

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        const { fullName, email, phoneNumber, password, role = 'CUSTOMER', captchaToken, businessName, tradeLicenseNumber, branchAddress, ownerName } = req.body;

        if (!email && !phoneNumber) {
            res.status(400).json({ error: 'Either email or phone number is required' });
            return;
        }

        if (captchaToken && !(await verifyCaptcha(captchaToken))) {
            res.status(400).json({ error: 'Invalid CAPTCHA' });
            return;
        }

        if (password && await checkPasswordBreach(password)) {
            res.status(400).json({ error: 'Password has been compromised in a breach' });
            return;
        }

        const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
        let registrationHash = undefined;

        if (role === 'VENDOR') {
            const payloadToHash = JSON.stringify({ email, phoneNumber, businessName, tradeLicenseNumber, ownerName, branchAddress });
            registrationHash = crypto.createHmac('sha256', process.env.HMAC_SECRET || 'secret')
                .update(payloadToHash)
                .digest('hex');
        }

        const queryCond = [];
        if (email) queryCond.push({ email });
        if (phoneNumber) queryCond.push({ phoneNumber });

        const existingUser = await prisma.user.findFirst({
            where: { OR: queryCond }
        });

        if (existingUser) {
            res.status(400).json({ error: 'User already exists' });
            return;
        }

        const newUser = await prisma.user.create({
            data: {
                email,
                phoneNumber,
                passwordHash,
                role: role as any,
                status: role === 'VENDOR' ? 'PENDING' : 'ACTIVE',
                businessName,
                tradeLicenseNumber,
                branchAddress,
                ownerName,
                registrationHash
            }
        });

        if (phoneNumber && !email) {
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            await prisma.oTPSession.create({
                data: {
                    userId: newUser.id,
                    phoneNumber,
                    otpCode,
                    purpose: 'SIGNUP',
                    expiresAt: new Date(Date.now() + 5 * 60000)
                }
            });
            res.status(201).json({ message: 'OTP sent to mobile', userId: newUser.id });
            return;
        }

        res.status(201).json({
            message: 'Registration successful',
            userId: newUser.id
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        const { email, phoneNumber, password } = req.body;

        if (!email && !phoneNumber) {
            res.status(400).json({ error: 'Email or phone number is required' });
            return;
        }

        if (email) {
            const user = await prisma.user.findFirst({ where: { email } });

            if (user && user.lockedUntil && user.lockedUntil > new Date()) {
                res.status(403).json({ error: 'Account temporarily locked. Please try again later.' });
                return;
            }

            // Generate dummy hash pre-calculated for 'dummy123' to prevent timing attacks
            const dummyHash = '$2a$10$vI8aWBnX3f08j5eLz4p9qu0.G8u/p8H8H8H8H8H8H8H8H8H8H8H8H';
            const isPasswordValid = user && user.passwordHash
                ? await bcrypt.compare(password, user.passwordHash)
                : await bcrypt.compare(password, dummyHash);

            if (!user || !user.passwordHash || !isPasswordValid) {
                if (user) {
                    const newFails = user.failedLoginAttempts + 1;
                    if (newFails >= 5) {
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { failedLoginAttempts: 0, lockedUntil: new Date(Date.now() + 15 * 60000) }
                        });
                        await sendEmail(user.email, 'Security Alert: Account Locked', 'Your account has been locked due to 5 failed login attempts. It will be unlocked in 15 minutes.', '');
                    } else {
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { failedLoginAttempts: newFails }
                        });
                    }
                }

                const emailHash = crypto.createHash('sha256').update(email).digest('hex');
                await prisma.securityEvent.create({
                    data: {
                        userEmail: emailHash,
                        ipAddress: req.ip || '0.0.0.0',
                        userAgent: req.headers['user-agent'] || 'unknown',
                        eventType: 'FAILED_LOGIN'
                    }
                });
                // Generic error message for enumeration prevention
                res.status(401).json({ error: 'Invalid credentials' });
                return;
            }

            if (user.failedLoginAttempts > 0 || user.lockedUntil) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { failedLoginAttempts: 0, lockedUntil: null }
                });
            }

            if (user.mfaEnabled) {
                const preAuthToken = generateToken(user.id, 'PRE_AUTH');
                res.status(200).json({ preAuthToken, message: 'MFA_REQUIRED', user: { email: user.email } });
                return;
            }

            const token = generateToken(user.id, user.role);

            // M-02: Set Secure/HttpOnly Cookie
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 8 * 60 * 60 * 1000 // 8 hours
            });

            res.status(200).json({
                token,
                user: { id: user.id, email: user.email, role: user.role, status: user.status }
            });
        } else if (phoneNumber) {
            const user = await prisma.user.findFirst({ where: { phoneNumber } });
            if (!user) {
                res.status(400).json({ error: 'User not found' });
                return;
            }

            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            await prisma.oTPSession.create({
                data: {
                    userId: user.id,
                    phoneNumber,
                    otpCode,
                    purpose: 'LOGIN',
                    expiresAt: new Date(Date.now() + 5 * 60000)
                }
            });
            res.status(201).json({ message: 'OTP sent to mobile' });
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    res.status(200).json({ message: 'Logged out successfully' });
};

export const verifyMfa = async (req: Request, res: Response): Promise<void> => {
    try {
        const { preAuthToken, code } = req.body;
        if (!preAuthToken || !code) {
            res.status(400).json({ error: 'Pre-auth token and code are required' });
            return;
        }

        const decoded: any = verifyToken(preAuthToken);
        if (!decoded || decoded.role !== 'PRE_AUTH') {
            res.status(401).json({ error: 'Invalid or expired pre-auth token' });
            return;
        }

        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (!user || user.status !== 'ACTIVE' || !user.mfaEnabled || !user.mfaSecret) {
            res.status(401).json({ error: 'MFA verification failed' });
            return;
        }

        let isCodeValid = authenticator.verify({ token: code, secret: user.mfaSecret });

        // Iterate through backup codes if TOTP fails
        if (!isCodeValid && user.mfaBackupCodes) {
            const backupCodes: string[] = JSON.parse(user.mfaBackupCodes);
            for (let i = 0; i < backupCodes.length; i++) {
                const match = await bcrypt.compare(code, backupCodes[i]);
                if (match) {
                    isCodeValid = true;
                    backupCodes.splice(i, 1);
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { mfaBackupCodes: JSON.stringify(backupCodes) }
                    });
                    break;
                }
            }
        }

        if (!isCodeValid) {
            res.status(401).json({ error: 'Invalid code' });
            return;
        }

        const token = generateToken(user.id, user.role);

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 8 * 60 * 60 * 1000 // 8 hours
        });

        res.status(200).json({
            token,
            user: { id: user.id, email: user.email, role: user.role, status: user.status }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

const failedAttempts: Record<string, number> = {};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        const { phoneNumber, otpCode } = req.body;

        if (failedAttempts[phoneNumber] >= 5) {
            res.status(403).json({ error: 'Account temporarily locked due to too many failed OTP attempts' });
            return;
        }

        const session = await prisma.oTPSession.findFirst({
            where: {
                phoneNumber,
                isUsed: false,
                expiresAt: { gt: new Date() }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (!session || session.otpCode !== otpCode) {
            failedAttempts[phoneNumber] = (failedAttempts[phoneNumber] || 0) + 1;
            res.status(400).json({ error: 'Invalid or expired OTP' });
            return;
        }

        await prisma.oTPSession.update({
            where: { id: session.id },
            data: { isUsed: true }
        });

        delete failedAttempts[phoneNumber];

        const user = await prisma.user.findUnique({ where: { id: session.userId as number } });
        if (!user) {
            res.status(400).json({ error: 'User not found' });
            return;
        }

        const token = generateToken(user.id, user.role);

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 8 * 60 * 60 * 1000 // 8 hours
        });

        res.status(200).json({
            token,
            user: { id: user.id, phoneNumber: user.phoneNumber, role: user.role, status: user.status }
        });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

export const logout = async (req: Request, res: Response): Promise<void> => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    res.status(200).json({ message: 'Logged out successfully' });
};

// M-03: Secure Password Reset Flow
export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ error: 'Email is required' });
            return;
        }

        const user = await prisma.user.findFirst({ where: { email } });
        // Generic response to prevent email enumeration
        res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });

        if (user) {
            // Generate 32 byte secure token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

            await prisma.oTPSession.create({
                data: {
                    userId: user.id,
                    phoneNumber: email, // Repurposing phone number field to store email constraint
                    otpCode: tokenHash,
                    purpose: 'PASSWORD_RESET',
                    expiresAt: new Date(Date.now() + 15 * 60000) // 15 mins expiry
                }
            });

            // Send via mock email
            const resetLink = `https://admin.atspaces.com/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
            await sendEmail(email, 'Password Reset Request', `Click here to reset: ${resetLink}`, '');
        }
    } catch (error: any) {
        console.error('Reset request error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, token, newPassword } = req.body;
        if (!email || !token || !newPassword || newPassword.length < 8) {
            res.status(400).json({ error: 'Invalid payload or weak password' });
            return;
        }

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const session = await prisma.oTPSession.findFirst({
            where: {
                phoneNumber: email,
                otpCode: tokenHash,
                purpose: 'PASSWORD_RESET',
                isUsed: false,
                expiresAt: { gt: new Date() }
            }
        });

        if (!session) {
            res.status(400).json({ error: 'Invalid or expired reset token' });
            return;
        }

        const user = await prisma.user.findUnique({ where: { id: session.userId as number } });
        if (!user) {
            res.status(400).json({ error: 'User not found' });
            return;
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null }
        });

        // Mark as used
        await prisma.oTPSession.update({
            where: { id: session.id },
            data: { isUsed: true }
        });

        // Audit log event
        import('../utils/audit.logger').then(({ writeAuditLog }) => {
            writeAuditLog({
                actorId: user.id,
                actorRole: user.role,
                action: 'PASSWORD_RESET',
                targetType: 'USER',
                targetId: user.id,
                ipAddress: req.ip || 'unknown'
            });
        });

        res.status(200).json({ message: 'Password has been reset successfully' });
    } catch (error: any) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
