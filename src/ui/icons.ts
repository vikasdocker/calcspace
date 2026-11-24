import { Activity, ArrowLeftRight, BadgePercent, Braces, BriefcaseBusiness, Calculator, CalendarDays, CirclePercent, Clock3, Coffee,
  Compass, Fingerprint, HeartPulse, Landmark, LockKeyhole, Network, ReceiptText, Ruler, Sigma, Wallet, type LucideIcon } from 'lucide-react'
import type { Category } from '../calculators/core'

export const categoryIcons: Record<Category, LucideIcon> = {
  math: Sigma, finance: Landmark, business: BriefcaseBusiness, convert: ArrowLeftRight,
  health: HeartPulse, date: CalendarDays, tech: Braces, daily: Coffee,
}
export const calculatorIcons: Record<string, LucideIcon> = {
  'standard-calculator': Calculator, 'scientific-calculator': Calculator, 'emi-calculator': Landmark,
  'percentage-calculator': CirclePercent, 'percentage-change-calculator': BadgePercent,
  'bmi-calculator': Activity, 'gst-calculator': ReceiptText, 'age-calculator': CalendarDays,
  'acre-to-guntha': Ruler, 'salary-hike-calculator': Wallet, 'ip-subnet-calculator': Network,
  'cidr-calculator': Network, 'time-zone-converter': Compass, 'time-duration-calculator': Clock3,
  'sha-256-hash-generator': Fingerprint, 'password-generator': LockKeyhole,
}
