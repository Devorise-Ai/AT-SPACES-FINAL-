import { Router } from 'express';
import { handleChat } from '../controllers/chat.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Protect chat route so we have access to user.id for conversation tracking
// router.use(authenticate); // Temporarily disabled for testing AI agent access

/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Chat with the AT Spaces Booking Agent
 *     description: Send messages to the AI agent to search for branches and book spaces.
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 description: The message for the AI agent
 *               threadId:
 *                 type: string
 *                 description: (Optional) The conversation thread ID for continuing context
 *     responses:
 *       200:
 *         description: Successful response from the AI
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 */
router.post('/', handleChat);

export default router;
