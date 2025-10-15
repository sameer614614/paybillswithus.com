import { z } from 'zod';

const currentYear = new Date().getFullYear();

const billingAddressSchema = z.object({
  line1: z.string().min(1, 'Address line 1 is required'),
  line2: z.string().optional().nullable(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().min(3, 'Postal code is required'),
});

export const paymentMethodSchema = z
  .object({
    type: z.enum(['CREDIT_CARD', 'DEBIT_CARD', 'BANK_ACCOUNT']),
    provider: z.string().min(1, 'Provider is required'),
    accountNumber: z.string().min(4, 'Account number is required'),
    cardholderName: z.string().optional().nullable(),
    nickname: z.string().optional().nullable(),
    expMonth: z.number().int().min(1).max(12).optional().nullable(),
    expYear: z
      .number()
      .int()
      .min(currentYear)
      .max(currentYear + 15)
      .optional()
      .nullable(),
    brand: z.string().optional().nullable(),
    securityCode: z.string().optional().nullable(),
    billingAddress: billingAddressSchema.optional().nullable(),
    useProfileAddress: z.boolean().optional(),
    isDefault: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const digitsOnly = data.accountNumber.replace(/\D/g, '');
    if (data.type !== 'BANK_ACCOUNT' && digitsOnly.length < 12) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['accountNumber'],
        message: 'Card numbers must include at least 12 digits.',
      });
    }

    if (data.type === 'BANK_ACCOUNT' && digitsOnly.length < 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['accountNumber'],
        message: 'Account numbers must include at least 4 digits.',
      });
    }

    if (data.type !== 'BANK_ACCOUNT') {
      if (!data.cardholderName || data.cardholderName.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cardholderName'],
          message: 'Card holder name is required.',
        });
      }

      if (data.expMonth == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['expMonth'],
          message: 'Expiration month is required for cards.',
        });
      }

      if (data.expYear == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['expYear'],
          message: 'Expiration year is required for cards.',
        });
      }

      if (!data.securityCode || !/^\d{3,4}$/.test(data.securityCode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['securityCode'],
          message: 'CVV must be 3 or 4 digits.',
        });
      }

      if (!data.useProfileAddress && !data.billingAddress) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['billingAddress'],
          message: 'Provide a billing address or use your profile address.',
        });
      }
    }
  });

export const paymentMethodUpdateSchema = z
  .object({
    provider: z.string().min(1, 'Provider is required').optional(),
    nickname: z.string().optional().nullable(),
    cardholderName: z.string().optional().nullable(),
    expMonth: z.number().int().min(1).max(12).optional().nullable(),
    expYear: z
      .number()
      .int()
      .min(currentYear)
      .max(currentYear + 15)
      .optional()
      .nullable(),
    brand: z.string().optional().nullable(),
    accountNumber: z.string().min(4, 'Account number must have at least 4 digits').optional(),
    securityCode: z.string().optional().nullable(),
    billingAddress: billingAddressSchema.optional().nullable(),
    useProfileAddress: z.boolean().optional(),
    isDefault: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.securityCode && !/^\d{3,4}$/.test(data.securityCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['securityCode'],
        message: 'CVV must be 3 or 4 digits.',
      });
    }
  });
