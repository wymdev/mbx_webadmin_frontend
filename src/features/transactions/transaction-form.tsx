import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import ArrowLeft from 'lucide-react/icons/arrow-left'
import ArrowRight from 'lucide-react/icons/arrow-right'
import Check from 'lucide-react/icons/check'
import ChevronsUpDown from 'lucide-react/icons/chevrons-up-down'
import ReceiptText from 'lucide-react/icons/receipt-text'
import ShieldCheck from 'lucide-react/icons/shield-check'
import { transactionSchema, type Transaction, type TransactionInput } from '@/domain/models'
import { calculateTotal } from '@/domain/money'
import { useCustomers, useDemoMutation, useTransactions, useSettings } from '@/services/queries'
import { repository } from '@/services/demo'
import { PageHeader } from '@/components/page-header'
import { Field, SelectField } from '@/components/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ReceiptDialog } from './receipt'
import { formatMoney } from '@/lib/utils'
import { toast } from 'sonner'

const defaults: TransactionInput = {
  customerName: '',
  phone: '',
  identityType: 'passport',
  passport: '',
  nrc: '',
  nationality: 'Myanmar',
  transferMethod: 'Bank transfer',
  exchangeType: 'Buy',
  fromCurrency: 'THB',
  toCurrency: 'MMK',
  amount: '',
  rate: '125.5',
  operation: 'multiply',
  source: 'Walk-in',
  description: '',
}
export default function TransactionForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useTransactions()
  const existing = query.data?.find((t) => t.id === id)
  const customers = useCustomers()
  const methodsQuery = useSettings('methods')
  const sourcesQuery = useSettings('sources')
  const methodOptions = useMemo(
    () => [
      ...new Set([
        ...(methodsQuery.data || []).filter((r) => r.active).map((r) => r.name),
        ...(existing ? [existing.transferMethod] : []),
      ]),
    ],
    [methodsQuery.data, existing],
  )
  const sourceOptions = useMemo(
    () => [
      ...new Set([
        ...(sourcesQuery.data || []).filter((r) => r.active).map((r) => r.name),
        ...(existing ? [existing.source] : []),
      ]),
    ],
    [sourcesQuery.data, existing],
  )
  const form = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: defaults,
  })
  const {
    register,
    control,
    formState: { errors },
    reset,
    setValue,
  } = form
  const values = { ...defaults, ...useWatch({ control }) }
  const [customerOpen, setCustomerOpen] = useState(false)
  const [receipt, setReceipt] = useState<Transaction | null>(null)
  const save = useDemoMutation((input: TransactionInput) => repository.saveTransaction(input, id))
  useEffect(() => {
    if (existing) reset(existing)
  }, [existing, reset])
  useEffect(() => {
    if (id) return
    if (methodsQuery.data && !methodOptions.includes(values.transferMethod || ''))
      setValue('transferMethod', methodOptions[0] || '')
    if (sourcesQuery.data && !sourceOptions.includes(values.source || ''))
      setValue('source', sourceOptions[0] || '')
  }, [
    id,
    methodsQuery.data,
    sourcesQuery.data,
    values.transferMethod,
    values.source,
    setValue,
    methodOptions,
    sourceOptions,
  ])
  let total = '0.00'
  try {
    total = calculateTotal(values.amount, values.rate, values.operation)
  } catch {
    /* incomplete form */
  }
  if (id && query.isPending) return <p className="p-8">Loading transaction…</p>
  if (id && !existing)
    return (
      <div className="panel empty-state">
        <h2>Transaction not found</h2>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/transactions')}>
          Back to ledger
        </Button>
      </div>
    )
  function select(name: keyof TransactionInput, options: string[]) {
    return (
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <SelectField
            id={name}
            value={field.value}
            onChange={field.onChange}
            options={options}
            invalid={!!errors[name]}
          />
        )}
      />
    )
  }
  function input(name: keyof TransactionInput, placeholder: string, type = 'text') {
    return (
      <Input
        id={name}
        {...register(name)}
        placeholder={placeholder}
        type={type}
        step={type === 'number' ? 'any' : undefined}
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
      />
    )
  }
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="OPERATIONS / TRANSACTIONS"
        title={id ? 'Edit transaction' : 'New transaction'}
        description="A few details. A clear exchange. A receipt ready to go."
      >
        <Button variant="outline" onClick={() => navigate('/transactions')}>
          <ArrowLeft />
          Back to ledger
        </Button>
      </PageHeader>
      <form
        onSubmit={form.handleSubmit((data) =>
          save.mutate(data, {
            onSuccess: (result) => {
              setReceipt(result)
              toast.success(id ? 'Demo transaction updated' : 'Demo transaction created')
            },
            onError: (error) => toast.error(error.message),
          }),
        )}
        noValidate
      >
        <div className="form-grid">
          <div>
            <section className="panel form-section">
              <div className="form-section-title">
                <span className="section-number">01</span>
                <div>
                  <h2>Customer details</h2>
                  <p className="panel-subtitle">Find an existing customer or enter someone new.</p>
                </div>
              </div>
              <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between mb-5 text-muted-foreground"
                  >
                    <span className="text-xs">Find an existing customer…</span>
                    <ChevronsUpDown className="size-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[min(400px,85vw)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search customers…" />
                    <CommandList>
                      <CommandEmpty>No customer found. Enter their details below.</CommandEmpty>
                      {customers.data?.map((customer) => (
                        <CommandItem
                          key={customer.id}
                          value={`${customer.name} ${customer.phone}`}
                          onSelect={() => {
                            setValue('customerName', customer.name)
                            setValue('phone', customer.phone)
                            setValue('identityType', customer.identityType)
                            setValue('passport', customer.passport)
                            setValue('nrc', customer.nrc)
                            setValue('nationality', customer.nationality)
                            setCustomerOpen(false)
                          }}
                        >
                          <span className="flex-1">
                            {customer.name}
                            <small className="block text-muted-foreground">{customer.phone}</small>
                          </span>
                          {values.customerName === customer.name && <Check />}
                        </CommandItem>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <div className="field-grid">
                <Field
                  label="Customer name *"
                  id="customerName"
                  error={errors.customerName?.message}
                >
                  {input('customerName', 'Full name')}
                </Field>
                <Field label="Phone number *" id="phone" error={errors.phone?.message}>
                  {input('phone', '+66 81 234 5678', 'tel')}
                </Field>
                <Field label="Identity document" id="identityType">
                  {select('identityType', ['passport', 'nrc'])}
                </Field>
                {values.identityType === 'passport' ? (
                  <>
                    <Field label="Passport number *" id="passport" error={errors.passport?.message}>
                      {input('passport', 'Passport number')}
                    </Field>
                    <Field
                      label="Nationality *"
                      id="nationality"
                      error={errors.nationality?.message}
                    >
                      {input('nationality', 'Nationality')}
                    </Field>
                  </>
                ) : (
                  <Field label="NRC number *" id="nrc" error={errors.nrc?.message}>
                    {input('nrc', '12/DEMO(N)123456')}
                  </Field>
                )}
                <Field label="Customer source" id="source">
                  {select('source', sourceOptions)}
                </Field>
              </div>
            </section>
            <section className="panel form-section">
              <div className="form-section-title">
                <span className="section-number">02</span>
                <div>
                  <h2>Exchange details</h2>
                  <p className="panel-subtitle">
                    Choose the direction, amount and rate for this exchange.
                  </p>
                </div>
              </div>
              <div className="field-grid">
                <Field label="Exchange type" id="exchangeType">
                  {select('exchangeType', ['Buy', 'Sell'])}
                </Field>
                <Field label="Transfer method" id="transferMethod">
                  {select('transferMethod', methodOptions)}
                </Field>
                <Field label="From currency" id="fromCurrency">
                  {select('fromCurrency', ['THB', 'MMK', 'USD', 'SGD'])}
                </Field>
                <Field label="To currency" id="toCurrency" error={errors.toCurrency?.message}>
                  {select('toCurrency', ['MMK', 'THB', 'USD', 'SGD'])}
                </Field>
                <Field label="Amount *" id="amount" error={errors.amount?.message}>
                  {input('amount', '0.00', 'number')}
                </Field>
                <Field label="Exchange rate *" id="rate" error={errors.rate?.message}>
                  {input('rate', '125.50', 'number')}
                </Field>
                <Field label="Calculation method" id="operation">
                  {select('operation', ['multiply', 'divide'])}
                </Field>
                <Field label="Exchanged amount" id="total">
                  <Input
                    id="total"
                    readOnly
                    value={`${formatMoney(total)} ${values.toCurrency}`}
                    className="bg-muted font-semibold"
                  />
                </Field>
              </div>
              <div className="field mt-5">
                <label htmlFor="description">
                  Notes <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Add a note about this exchange…"
                  rows={3}
                />
              </div>
            </section>
          </div>
          <aside className="panel form-summary">
            <span className="metric-icon mb-4">
              <ReceiptText size={17} />
            </span>
            <h2>Exchange summary</h2>
            <p className="panel-subtitle mb-5">Review the details before saving.</p>
            <div className="summary-row">
              <span className="text-muted-foreground">Customer</span>
              <strong>{values.customerName || 'Not selected'}</strong>
            </div>
            <div className="summary-row">
              <span className="text-muted-foreground">Exchange</span>
              <span>
                {values.fromCurrency} <ArrowRight className="inline size-3 mx-1" />{' '}
                {values.toCurrency}
              </span>
            </div>
            <div className="summary-row">
              <span className="text-muted-foreground">Amount</span>
              <span>{formatMoney(values.amount || '0', values.fromCurrency)}</span>
            </div>
            <div className="summary-row">
              <span className="text-muted-foreground">Rate</span>
              <span>
                {values.operation === 'multiply' ? '×' : '÷'} {values.rate || '0'}
              </span>
            </div>
            <div className="summary-row">
              <span className="text-muted-foreground">Method</span>
              <span>{values.transferMethod}</span>
            </div>
            <div className="summary-total">
              <span>Exchanged amount</span>
              <strong>
                {formatMoney(total)}{' '}
                <small className="text-xs font-medium">{values.toCurrency}</small>
              </strong>
            </div>
            <Button type="submit" className="w-full mt-5" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : id ? 'Save changes' : 'Create transaction'}
              <ArrowRight />
            </Button>
            <p className="text-[10px] text-muted-foreground mt-4 flex items-start gap-2 leading-relaxed">
              <ShieldCheck className="size-4 shrink-0" />
              Demo only. No funds move. Amounts are rounded half up to 2 decimal places.
            </p>
          </aside>
        </div>
      </form>
      <ReceiptDialog
        transaction={receipt}
        onClose={() => {
          setReceipt(null)
          navigate('/transactions')
        }}
      />
    </div>
  )
}
