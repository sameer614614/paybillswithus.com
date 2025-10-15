import prisma from '../utils/prisma.js';
import { encryptSensitive } from '../utils/encryption.js';

type PaymentMethodType = 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_ACCOUNT';

export async function listPaymentMethods(userId: string) {
  return prisma.paymentMethod.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      type: true,
      provider: true,
      nickname: true,
      expMonth: true,
      expYear: true,
      brand: true,
      last4: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function createPaymentMethod(
  userId: string,
  data: {
    type: PaymentMethodType;
    provider: string;
    accountNumber: string;
    nickname?: string | null;
    expMonth?: number | null;
    expYear?: number | null;
    brand?: string | null;
    last4: string;
  },
) {
  const created = await prisma.paymentMethod.create({
    data: {
      userId,
      type: data.type,
      provider: data.provider,
      accountNumber: encryptSensitive(data.accountNumber),
      nickname: data.nickname ?? null,
      expMonth: data.expMonth ?? null,
      expYear: data.expYear ?? null,
      brand: data.brand ?? null,
      last4: data.last4,
    },
  });

  return {
    id: created.id,
    type: created.type,
    provider: created.provider,
    nickname: created.nickname,
    expMonth: created.expMonth,
    expYear: created.expYear,
    brand: created.brand,
    last4: created.last4,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  };
}

export async function updatePaymentMethod(
  userId: string,
  id: string,
  data: {
    provider?: string;
    nickname?: string | null;
    expMonth?: number | null;
    expYear?: number | null;
    brand?: string | null;
  },
) {
  const existing = await prisma.paymentMethod.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    const error = new Error('Payment method not found');
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  const updated = await prisma.paymentMethod.update({
    where: { id },
    data,
  });

  return {
    id: updated.id,
    type: updated.type,
    provider: updated.provider,
    nickname: updated.nickname,
    expMonth: updated.expMonth,
    expYear: updated.expYear,
    brand: updated.brand,
    last4: updated.last4,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

export async function deletePaymentMethod(userId: string, id: string) {
  const existing = await prisma.paymentMethod.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    const error = new Error('Payment method not found');
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  await prisma.paymentMethod.delete({ where: { id } });
}
