import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/authenticate.js';
import { paymentMethodSchema, paymentMethodUpdateSchema } from '../validators/paymentMethodValidators.js';
import { createPaymentMethod, deletePaymentMethod, listPaymentMethods, updatePaymentMethod } from '../services/paymentMethodService.js';

export async function getPaymentMethods(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const paymentMethods = await listPaymentMethods(userId);
  res.json({ paymentMethods });
}

export async function postPaymentMethod(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const parsed = paymentMethodSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Invalid payment method payload', details: parsed.error.flatten() });
  }

  const payload = parsed.data;
  const paymentMethod = await createPaymentMethod(userId, {
    type: payload.type,
    provider: payload.provider,
    accountNumber: payload.accountNumber,
    cardholderName: payload.cardholderName ?? null,
    nickname: payload.nickname ?? null,
    expMonth: payload.expMonth ?? null,
    expYear: payload.expYear ?? null,
    brand: payload.brand ?? null,
    securityCode: payload.securityCode ?? null,
    billingAddress: payload.billingAddress ?? null,
    useProfileAddress: payload.useProfileAddress ?? false,
    isDefault: payload.isDefault ?? false,
  });
  res.status(201).json({ paymentMethod });
}

export async function patchPaymentMethod(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const { id } = req.params;

  const parsed = paymentMethodUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Invalid payment method payload', details: parsed.error.flatten() });
  }

  const payload = parsed.data;

  const paymentMethod = await updatePaymentMethod(userId, id, {
    provider: payload.provider,
    nickname: payload.nickname ?? null,
    expMonth: payload.expMonth ?? null,
    expYear: payload.expYear ?? null,
    brand: payload.brand ?? null,
    cardholderName: payload.cardholderName ?? null,
    accountNumber: payload.accountNumber ?? null,
    securityCode: payload.securityCode ?? null,
    billingAddress: payload.billingAddress ?? null,
    useProfileAddress: payload.useProfileAddress,
    isDefault: payload.isDefault,
  });

  res.json({ paymentMethod });
}

export async function removePaymentMethod(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const { id } = req.params;
  await deletePaymentMethod(userId, id);
  res.status(204).send();
}
