import { number, safeParse } from 'zod/mini'

export type Category = 'math' | 'finance' | 'business' | 'convert' | 'health' | 'date' | 'tech' | 'daily'
export type RawInputs = Record<string, string>
export type Option = { value: string; label: string }
type Visibility = { key: string; values: readonly string[] }

type FieldBase<K extends string> = {
  key: K
  label: string
  initial: string
  help?: string
  only?: Visibility
}
type NumberField<K extends string = string> = FieldBase<K> & {
  kind: 'number'
  min?: number
  max?: number
  integer?: boolean
}
type TextField<K extends string = string> = FieldBase<K> & {
  kind: 'text' | 'textarea' | 'date' | 'time' | 'datetime-local'
  maxLength?: number
  optional?: boolean
}
type SelectField<K extends string = string> = FieldBase<K> & { kind: 'select'; options: readonly Option[] }
export type Field = NumberField | TextField | SelectField
type Parsed<F extends Field> = { [P in F as P['key']]: P extends NumberField ? number : string }

export type ResultLine = { label: string; value: number | string; unit?: string; format?: 'money' | 'integer' }
export type CalculationResult = readonly [ResultLine, ...ResultLine[]]
export type Calculator = {
  id: string
  title: string
  description: string
  category: Category
  also?: readonly Category[]
  keywords?: readonly string[]
  fields: readonly Field[]
  formula: string
  note?: string
  path: string
  example?: string
  faq?: { question: string; answer: string }
  privateResult?: boolean
  keypad?: 'standard' | 'scientific'
  calculate: (inputs: RawInputs) => CalculationResult | Promise<CalculationResult>
}

export class InputError extends Error {
  constructor(message: string, public field?: string) {
    super(message)
    this.name = 'InputError'
  }
}

export function requireInput(condition: unknown, message: string, field?: string): asserts condition {
  if (!condition) throw new InputError(message, field)
}

export const num = <K extends string>(key: K, label: string, initial: number, options: Partial<Omit<NumberField<K>, 'kind' | 'key' | 'label' | 'initial'>> = {}): NumberField<K> =>
  ({ kind: 'number', key, label, initial: String(initial), ...options })
export const pos = <K extends string>(key: K, label: string, initial: number, only?: Visibility) =>
  num(key, label, initial, { min: Number.MIN_VALUE, only })
export const nonneg = <K extends string>(key: K, label: string, initial: number) => num(key, label, initial, { min: 0 })
export const whole = <K extends string>(key: K, label: string, initial: number, min = 0, max = 10000) =>
  num(key, label, initial, { min, max, integer: true })
export const txt = <K extends string>(key: K, label: string, initial: string, options: Partial<Omit<TextField<K>, 'key' | 'label' | 'initial'>> = {}): TextField<K> =>
  ({ kind: 'text', key, label, initial, ...options })
export const select = <K extends string>(key: K, label: string, initial: string, values: readonly (string | Option)[]): SelectField<K> =>
  ({ kind: 'select', key, label, initial, options: values.map(value => typeof value === 'string' ? { value, label: value } : value) })
export const option = (value: string, label: string): Option => ({ value, label })
export const showFor = (key: string, ...values: string[]): Visibility => ({ key, values })
export const line = (label: string, value: string | number, unit?: string): ResultLine => ({ label, value, unit })
export const money = (label: string, value: number): ResultLine => ({ label, value, format: 'money' })
export const percent = (label: string, value: number): ResultLine => line(label, value, '%')
export const result = (...lines: [ResultLine, ...ResultLine[]]): CalculationResult => lines

export const initialInputs = (fields: readonly Field[]): RawInputs =>
  Object.fromEntries(fields.map(field => [field.key, field.initial]))

export function visible(field: Field, values: RawInputs) {
  return !field.only || field.only.values.includes(values[field.only.key])
}

const finite = number()
const numericText = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i

function readField(field: Field, raw: string): string | number {
  if (field.kind === 'select') {
    requireInput(field.options.some(option => option.value === raw), `Choose a valid option for ${field.label.toLowerCase()}.`, field.key)
    return raw
  }
  if (field.kind === 'number') {
    const cleaned = raw.trim()
    requireInput(cleaned, `Enter ${field.label.toLowerCase()}.`, field.key)
    const parsed = safeParse(finite, Number(cleaned))
    requireInput(numericText.test(cleaned) && parsed.success, 'Enter a finite number, such as 12.5 or 1e6.', field.key)
    const value = parsed.data
    requireInput(value !== 0 || !/[1-9]/.test(cleaned.split(/e/i)[0]), 'This number is too small to represent.', field.key)
    if (field.integer) requireInput(Number.isSafeInteger(value), 'Enter a whole number within the supported range.', field.key)
    if (field.min === Number.MIN_VALUE) requireInput(value > 0, 'Enter a number greater than zero.', field.key)
    else if (field.min !== undefined) requireInput(value >= field.min, `Enter ${field.min} or more.`, field.key)
    if (field.max !== undefined) requireInput(value <= field.max, `Enter ${field.max} or less.`, field.key)
    return value
  }
  requireInput(field.optional || raw.trim(), `Enter ${field.label.toLowerCase()}.`, field.key)
  requireInput(raw.length <= (field.maxLength ?? 50000), `Keep ${field.label.toLowerCase()} within ${field.maxLength ?? 50000} characters.`, field.key)
  return raw
}

function checkResult(output: CalculationResult): CalculationResult {
  for (const item of output) {
    requireInput(typeof item.value !== 'number' || Number.isFinite(item.value), 'The result is outside the supported numeric range.')
  }
  return output
}

export function define<const F extends readonly Field[]>(definition: Omit<Calculator, 'path' | 'fields' | 'calculate'> & {
  fields: F
  group?: 'converters'
  calculate: (inputs: Parsed<F[number]>) => CalculationResult | Promise<CalculationResult>
}): Calculator {
  const { fields, group, calculate, ...details } = definition
  return {
    ...details,
    fields,
    path: `/${group ?? 'calculators'}/${details.id}`,
    calculate(values) {
      const parsed = Object.fromEntries(fields.map(field => [
        field.key,
        readField(field, visible(field, values) ? (values[field.key] ?? '') : field.initial),
      ])) as Parsed<F[number]>
      const value = calculate(parsed)
      return value instanceof Promise ? value.then(checkResult) : checkResult(value)
    },
  }
}

const decimal = new Intl.NumberFormat('en-IN', { maximumSignificantDigits: 12 })
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })
export function formatValue(item: ResultLine) {
  const value = item.value
  if (typeof value === 'string') return value || '(empty)'
  const magnitude = Math.abs(value)
  if (item.format === 'money') return magnitude >= 1e18 ? `₹${value.toExponential(10)}` : currency.format(value)
  const formatted = magnitude >= 1e15 || (magnitude > 0 && magnitude < 1e-7) ? String(Number(value.toPrecision(12))) : decimal.format(value)
  return item.unit ? `${formatted}${item.unit === '%' ? '' : ' '}${item.unit}` : formatted
}

export const resultText = (output: CalculationResult) => output.map(item => `${item.label}: ${formatValue(item)}`).join('\n')
