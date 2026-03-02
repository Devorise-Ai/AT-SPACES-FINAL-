import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                phoneNumber: true,
                role: true,
                status: true,
                createdAt: true
            }
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.status(200).json(user);

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id;
        const { email } = req.body; // Add fullName if added to Prisma schema later

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                email
            },
            select: {
                id: true,
                email: true,
                phoneNumber: true,
                role: true,
                status: true
            }
        });

        res.status(200).json(updatedUser);

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
