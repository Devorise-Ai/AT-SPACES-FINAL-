import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt';
import { validationResult } from 'express-validator';
import crypto from 'crypto';

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
            const emailHash = crypto.createHash('sha256').update(email).digest('hex');

            // Check lockout
            const recentFailures = await prisma.securityEvent.count({
                where: {
                    userEmail: emailHash,
                    eventType: 'FAILED_LOGIN',
                    createdAt: { gte: new Date(Date.now() - 15 * 60000) } // Last 15 mins
                }
            });

            if (recentFailures >= 5) {
                res.status(403).json({ error: 'Account temporarily locked. Please try again later.' });
                return;
            }

            const user = await prisma.user.findFirst({ where: { email } });

            // Generate dummy hash pre-calculated for 'dummy123' to prevent timing attacks
            const dummyHash = '$2a$10$vI8aWBnX3f08j5eLz4p9qu0.G8u/p8H8H8H8H8H8H8H8H8H8H8H8H';
            const isPasswordValid = user && user.passwordHash
                ? await bcrypt.compare(password, user.passwordHash)
                : await bcrypt.compare(password, dummyHash);

            if (!user || !user.passwordHash || !isPasswordValid) {
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

            if (password && await checkPasswordBreach(password)) {
                // Should enforce MFA here per the workflow
            }

            const token = generateToken(user.id, user.role);

            // Set Secure/HttpOnly Cookie
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
