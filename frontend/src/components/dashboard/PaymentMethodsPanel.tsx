import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addPaymentMethod,
  deletePaymentMethod,
  getPaymentMethods,
  updatePaymentMethod,
  type PaymentMethod,
} from '../../api/paymentMethods'
import { useAuth } from '../../hooks/useAuth'

const paymentMethodFormSchema = z
  .object({
    type: z.enum(['CREDIT_CARD', 'DEBIT_CARD', 'BANK_ACCOUNT']),
    provider: z.string().min(1, 'Provider is required'),
    accountNumber: z.string().min(6, 'Account number must have at least 6 digits'),
    nickname: z.string().optional(),
    expMonth: z
      .string()
      .optional()
      .refine(
        (value) =>
          !value ||
          (/^\d{1,2}$/.test(value) && Number(value) >= 1 && Number(value) <= 12),
        {
          message: 'Month must be between 1 and 12',
        },
      ),
    expYear: z
      .string()
      .optional()
      .refine(
        (value) =>
          !value ||
          (/^\d{4}$/.test(value) && Number(value) >= new Date().getFullYear()),
        {
          message: 'Year must be this year or later',
        },
      ),
    brand: z.string().optional(),
  })
  .refine((data) => (data.type === 'BANK_ACCOUNT' ? true : !!data.expMonth && !!data.expYear), {
    message: 'Cards need an expiration month and year',
    path: ['expMonth'],
  })

type PaymentMethodFormValues = z.infer<typeof paymentMethodFormSchema>

type EditState = {
  id: string
  provider: string
  nickname: string | null
  expMonth: number | null
  expYear: number | null
  brand: string | null
}

function PaymentMethodsPanel() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<EditState | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PaymentMethodFormValues>({
    resolver: zodResolver(paymentMethodFormSchema),
    defaultValues: {
      type: 'CREDIT_CARD',
      provider: '',
      accountNumber: '',
      nickname: '',
      expMonth: '',
      expYear: '',
      brand: '',
    },
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => getPaymentMethods(token!),
    enabled: Boolean(token),
  })

  const createMutation = useMutation({
    mutationFn: (values: PaymentMethodFormValues) => {
      const sanitizedAccount = values.accountNumber.replace(/\s+/g, '')
      const digitsOnly = sanitizedAccount.replace(/[^0-9]/g, '')
      const last4 = digitsOnly.slice(-4)
      const expMonthValue =
        values.type === 'BANK_ACCOUNT' ? null : values.expMonth ? Number(values.expMonth) : null
      const expYearValue =
        values.type === 'BANK_ACCOUNT' ? null : values.expYear ? Number(values.expYear) : null
      return addPaymentMethod(token!, {
        type: values.type,
        provider: values.provider,
        accountNumber: sanitizedAccount,
        nickname: values.nickname || null,
        expMonth: expMonthValue,
        expYear: expYearValue,
        brand: values.type === 'BANK_ACCOUNT' ? null : values.brand || null,
        last4,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
      reset()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; provider: string; nickname: string | null; expMonth: number | null; expYear: number | null; brand: string | null }) =>
      updatePaymentMethod(token!, payload.id, {
        provider: payload.provider,
        nickname: payload.nickname,
        expMonth: payload.expMonth ?? undefined,
        expYear: payload.expYear ?? undefined,
        brand: payload.brand ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
      setEditing(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePaymentMethod(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
    },
  })

  const onSubmit = (values: PaymentMethodFormValues) => {
    createMutation.mutate(values)
  }

  const handleEdit = (method: PaymentMethod) => {
    setEditing({
      id: method.id,
      provider: method.provider,
      nickname: method.nickname,
      expMonth: method.expMonth,
      expYear: method.expYear,
      brand: method.brand,
    })
  }

  const handleEditChange = (field: keyof EditState, value: string) => {
    setEditing((prev) => {
      if (!prev) return prev
      if (field === 'expMonth' || field === 'expYear') {
        const parsed = value === '' ? null : Number(value)
        return { ...prev, [field]: Number.isNaN(parsed) ? null : parsed }
      }
      if (field === 'nickname' || field === 'brand') {
        return { ...prev, [field]: value.trim() === '' ? null : value }
      }
      return { ...prev, [field]: value }
    })
  }

  const handleEditSubmit = () => {
    if (!editing) return
    updateMutation.mutate({
      id: editing.id,
      provider: editing.provider,
      nickname: editing.nickname ?? null,
      expMonth: editing.expMonth ?? null,
      expYear: editing.expYear ?? null,
      brand: editing.brand ?? null,
    })
  }

  const handleDelete = (id: string) => {
    if (confirm('Remove this payment method?')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex flex-col gap-2 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Payment methods</h2>
          <p className="text-sm text-slate-600">Securely store the cards or bank accounts you authorize us to use.</p>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <div>
          {isLoading && <p className="text-sm text-slate-500">Loading payment methods…</p>}
          {error && <p className="text-sm text-red-600">{error instanceof Error ? error.message : 'Unable to load payment methods'}</p>}
          <ul className="mt-4 space-y-4">
            {data?.paymentMethods.map((method) => (
              <li key={method.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {method.provider}{' '}
                      <span className="text-sm font-normal text-slate-500">•••• {method.last4}</span>
                    </p>
                    <p className="text-sm text-slate-500">
                      {method.type === 'BANK_ACCOUNT' ? 'Bank account' : 'Card'}
                      {method.brand ? ` · ${method.brand}` : ''}
                      {method.expMonth && method.expYear ? ` · Expires ${String(method.expMonth).padStart(2, '0')}/${method.expYear}` : ''}
                    </p>
                    {method.nickname && <p className="text-sm text-slate-500">Nickname: {method.nickname}</p>}
                  </div>
                  <div className="flex gap-2 text-sm">
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-700 transition-colors hover:border-brand hover:text-brand"
                      onClick={() => handleEdit(method)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-red-200 px-3 py-1 font-semibold text-red-600 transition-colors hover:border-red-500 hover:bg-red-50"
                      onClick={() => handleDelete(method.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {editing?.id === method.id && (
                  <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex flex-col text-sm font-medium text-slate-700">
                        Provider
                        <input
                          value={editing.provider}
                          onChange={(event) => handleEditChange('provider', event.target.value)}
                          className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        />
                      </label>
                      <label className="flex flex-col text-sm font-medium text-slate-700">
                        Nickname
                        <input
                          value={editing.nickname ?? ''}
                          onChange={(event) => handleEditChange('nickname', event.target.value)}
                          className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        />
                      </label>
                      <label className="flex flex-col text-sm font-medium text-slate-700">
                        Brand
                        <input
                          value={editing.brand ?? ''}
                          onChange={(event) => handleEditChange('brand', event.target.value)}
                          className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        />
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex flex-col text-sm font-medium text-slate-700">
                          Exp. Month
                          <input
                            value={editing.expMonth ?? ''}
                            onChange={(event) => handleEditChange('expMonth', event.target.value)}
                            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                          />
                        </label>
                        <label className="flex flex-col text-sm font-medium text-slate-700">
                          Exp. Year
                          <input
                            value={editing.expYear ?? ''}
                            onChange={(event) => handleEditChange('expYear', event.target.value)}
                            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                          />
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-brand-dark"
                        onClick={handleEditSubmit}
                        disabled={updateMutation.isPending}
                      >
                        {updateMutation.isPending ? 'Saving…' : 'Save changes'}
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
                        onClick={() => setEditing(null)}
                      >
                        Cancel
                      </button>
                    </div>
                    {updateMutation.isError && (
                      <p className="text-sm text-red-600">
                        {updateMutation.error instanceof Error ? updateMutation.error.message : 'Unable to update method'}
                      </p>
                    )}
                  </div>
                )}
              </li>
            ))}

            {!isLoading && !data?.paymentMethods.length && (
              <li className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                No payment methods saved yet. Add one using the form to the right.
              </li>
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-base font-semibold text-slate-900">Add a new method</h3>
          <p className="mt-1 text-sm text-slate-600">
            We encrypt payment details in transit. Agents will verify any changes with you by phone before activating them.
          </p>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Type
              <select
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                {...register('type')}
              >
                <option value="CREDIT_CARD">Credit card</option>
                <option value="DEBIT_CARD">Debit card</option>
                <option value="BANK_ACCOUNT">Bank account</option>
              </select>
            </label>
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Provider
              <input
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                {...register('provider')}
              />
              {errors.provider && <span className="text-sm text-red-600">{errors.provider.message}</span>}
            </label>
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Account number
              <input
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                {...register('accountNumber')}
              />
              {errors.accountNumber && <span className="text-sm text-red-600">{errors.accountNumber.message}</span>}
            </label>
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Nickname (optional)
              <input
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                {...register('nickname')}
              />
            </label>

            {watch('type') !== 'BANK_ACCOUNT' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col text-sm font-medium text-slate-700">
                  Expiration month
                  <input
                    className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    placeholder="MM"
                    {...register('expMonth')}
                  />
                  {errors.expMonth && <span className="text-sm text-red-600">{errors.expMonth.message}</span>}
                </label>
                <label className="flex flex-col text-sm font-medium text-slate-700">
                  Expiration year
                  <input
                    className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    placeholder="YYYY"
                    {...register('expYear')}
                  />
                  {errors.expYear && <span className="text-sm text-red-600">{errors.expYear.message}</span>}
                </label>
              </div>
            )}

            {watch('type') !== 'BANK_ACCOUNT' && (
              <label className="flex flex-col text-sm font-medium text-slate-700">
                Card brand (optional)
                <input
                  className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  {...register('brand')}
                />
              </label>
            )}

            <button
              type="submit"
              className="w-full rounded-full bg-brand px-6 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Saving…' : 'Save method'}
            </button>
            {createMutation.isError && (
              <p className="text-sm text-red-600">
                {createMutation.error instanceof Error ? createMutation.error.message : 'Unable to save payment method'}
              </p>
            )}
            {createMutation.isSuccess && (
              <p className="text-sm text-green-600">Payment method saved successfully.</p>
            )}
          </form>
        </div>
      </div>
    </section>
  )
}

export default PaymentMethodsPanel
