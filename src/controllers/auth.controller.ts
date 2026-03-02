import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt';
import { validationResult } from 'express-validator';

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

        const { fullName, email, phoneNumber, password, role = 'CUSTOMER', captchaToken } = req.body;

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
                status: 'ACTIVE',
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
            if (!user || !user.passwordHash) {
                res.status(400).json({ error: 'Invalid credentials' });
                return;
            }

            const isPasswordValid = await bcrypt.compare(password, user.passwordHash as string);
            if (!isPasswordValid) {
                res.status(400).json({ error: 'Invalid credentials' });
                return;
            }

            if (password && await checkPasswordBreach(password)) {
                // Should enforce MFA here per the workflow
            }

            const token = generateToken(user.id, user.role);

            res.status(201).json({
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
        res.status(200).json({
            token,
            user: { id: user.id, phoneNumber: user.phoneNumber, role: user.role, status: user.status }
        });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}
