import { Router } from 'express';
import authRoutes from './authRoutes.js';
import paymentMethodRoutes from './paymentMethodRoutes.js';
import billerRoutes from './billerRoutes.js';
import receiptRoutes from './receiptRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/payment-methods', paymentMethodRoutes);
router.use('/billers', billerRoutes);
router.use('/receipts', receiptRoutes);

export default router;
