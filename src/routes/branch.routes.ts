import { Router } from 'express';
import { getBranches, getBranchById } from '../controllers/branch.controller';

const router = Router();

// Public routes
/**
 * @swagger
 * /api/branches:
 *   get:
 *     summary: Get all available branches
 *     tags: [Branches]
 *     responses:
 *       200:
 *         description: List of branches
 */
router.get('/', getBranches);

/**
 * @swagger
 * /api/branches/{id}:
 *   get:
 *     summary: Get a specific branch by ID
 *     tags: [Branches]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Branch details
 *       404:
 *         description: Branch not found
 */
router.get('/:id', getBranchById);

export default router;
