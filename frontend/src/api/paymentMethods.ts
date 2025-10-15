import { apiClient } from './client';

export type PaymentMethod = {
  id: string;
  type: 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_ACCOUNT';
  provider: string;
  nickname: string | null;
  expMonth: number | null;
  expYear: number | null;
  brand: string | null;
  last4: string;
  createdAt: string;
  updatedAt: string;
};

export type CreatePaymentMethodInput = {
  type: PaymentMethod['type'];
  provider: string;
  accountNumber: string;
  nickname?: string | null;
  expMonth?: number | null;
  expYear?: number | null;
  brand?: string | null;
  last4: string;
};

export async function getPaymentMethods(token: string) {
  return apiClient.get<{ paymentMethods: PaymentMethod[] }>('/payment-methods', { auth: token });
}

export async function addPaymentMethod(token: string, payload: CreatePaymentMethodInput) {
  return apiClient.post<{ paymentMethod: PaymentMethod }>('/payment-methods', payload, { auth: token });
}

export async function updatePaymentMethod(token: string, id: string, payload: Partial<Pick<CreatePaymentMethodInput, 'provider' | 'nickname' | 'expMonth' | 'expYear' | 'brand'>>) {
  return apiClient.patch<{ paymentMethod: PaymentMethod }>(`/payment-methods/${id}`, payload, { auth: token });
}

export async function deletePaymentMethod(token: string, id: string) {
  return apiClient.delete<void>(`/payment-methods/${id}`, { auth: token });
}
