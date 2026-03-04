import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes'; // force TS re-evaluation
import userRoutes from './routes/user.routes';
import branchRoutes from './routes/branch.routes';
import bookingRoutes from './routes/booking.routes';
import chatRoutes from './routes/chat.routes';
import vendorRoutes from './routes/vendor.routes';
import adminRoutes from './routes/admin.routes';
import mfaRoutes from './routes/mfa.routes';

const app = express();

import { setupSwagger } from './utils/swagger';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Setup Swagger Documentation
setupSwagger(app);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/availability', bookingRoutes); // Mapping availability logic inside booking routes
app.use('/api/chat', chatRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/mfa', mfaRoutes);

// Health Check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'AT Spaces API is running' });
});

// Root Route
app.get('/', (req, res) => {
    res.redirect('/api-docs');
});

export default app;
