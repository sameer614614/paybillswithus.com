import { z } from 'zod';

export const paymentMethodSchema = z.object({
  type: z.enum(['CREDIT_CARD', 'DEBIT_CARD', 'BANK_ACCOUNT']),
  provider: z.string().min(1),
  accountNumber: z.string().min(4),
  nickname: z.string().optional(),
  expMonth: z.number().int().min(1).max(12).nullable().optional(),
  expYear: z.number().int().min(new Date().getFullYear()).max(new Date().getFullYear() + 15).nullable().optional(),
  brand: z.string().optional(),
  last4: z.string().min(4).max(4),
});
