import { define, line, num, option, percent, pos, requireInput, result, select, txt, whole } from './core'
import { dayMs, displayDate, parseClock, parseDate } from './dates'

const category = 'health'
const height = num('height','Height (cm)', 175, { min: 50, max: 300 })
const weight = num('weight','Weight (kg)', 72, { min: 2, max: 700 })
const adultHeight = num('height','Height (cm)', 175, { min: 100, max: 250 })
const adultWeight = num('weight','Weight (kg)', 72, { min: 25, max: 400 })
const age = whole('age','Age (years)', 30, 18, 120)
const sex = select('sex','Sex used by the formula','female',[option('female','Female'),option('male','Male')])
const metabolicFields = [adultWeight, adultHeight, age, sex] as const
const activity = select('activity','Activity level','1.55',[
  option('1.2','Sedentary (1.20)'),option('1.375','Lightly active (1.375)'),option('1.55','Moderately active (1.55)'),
  option('1.725','Very active (1.725)'),option('1.9','Extremely active (1.90)'),
])
export const bmi = (weight: number, height: number) => weight / (height / 100) ** 2
export function restingCalories(weight: number, height: number, age: number, sex: string) {
  const estimate = 10 * weight + 6.25 * height - 5 * age + (sex === 'male' ? 5 : -161)
  requireInput(estimate > 0, 'The measurements are outside the range this equation can estimate.')
  return estimate
}
const bmrFormula = 'Mifflin–St Jeor: 10 × kg + 6.25 × cm − 5 × age + 5 for males, or −161 for females.'
const bmrNote = 'Adult reference estimate. Energy needs vary with body composition and circumstances including pregnancy, illness and athletic training.'
const activityFormula = 'Multiply the resting estimate by a selected activity factor to estimate a full day of energy use.'
const wholeEnergy = (label: string, energy: number) => line(label, Math.round(energy), 'kcal/day')
const duration = (seconds: number) => {
  requireInput(Number.isFinite(seconds) && Math.round(seconds) <= Number.MAX_SAFE_INTEGER, 'The pace is outside the supported range.')
  const total = Math.round(seconds)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2,'0')}`
}
function clock(seconds: number) {
  const next = ((seconds % 86400) + 86400) % 86400
  const days = Math.floor(seconds / 86400)
  const label = `${String(Math.floor(next / 3600)).padStart(2,'0')}:${String(Math.floor(next / 60) % 60).padStart(2,'0')}`
  return `${label}${days < 0 ? ' (previous day)' : days > 0 ? ' (next day)' : ''}`
}

export const healthCalculators = [
  define({ id: 'bmi-calculator', title: 'BMI Calculator', category, description: 'Estimate adult body mass index and see the corresponding reference category.', keywords: ['body mass index', 'weight height', 'BMI chart'],
    fields: [adultWeight,adultHeight], formula: 'Body mass index = weight in kilograms ÷ height in meters squared.',
    note: 'Uses CDC categories for ages 20 and older. BMI is a screening metric and does not directly measure body fat.',
    faq: { question: 'How are the adult BMI categories defined?', answer: 'Below 18.5 is underweight, 18.5 to below 25 is healthy weight, 25 to below 30 is overweight, and 30 or higher is obesity.' },
    calculate: ({ weight, height }) => {
      const value = bmi(weight, height)
      return result(line('Body mass index', Number(value.toFixed(2)), 'kg/m²'),
        line('Adult BMI category', value < 18.5 ? 'Underweight' : value < 25 ? 'Healthy weight' : value < 30 ? 'Overweight' : 'Obesity'))
    } }),
  define({ id: 'ideal-weight-calculator', title: 'Ideal Weight Calculator', category, description: 'Estimate a reference weight interval for an adult of a given height.', keywords: ['healthy weight range', 'target weight', 'BMI range'],
    fields: [adultHeight], formula: 'Reference weight = BMI × height in meters squared. The displayed interval uses 18.5 to 24.9 as reference bounds.',
    note: 'This is a population reference for ages 20+, not an individualized weight target.',
    calculate: ({ height }) => {
      const squared = (height / 100) ** 2
      return result(line('Reference range', `${(18.5 * squared).toFixed(1)}–${(24.9 * squared).toFixed(1)} kg`), line('Range midpoint', Number((21.7 * squared).toFixed(1)), 'kg'))
    } }),
  define({ id: 'body-fat-estimate', title: 'Body Fat Estimate', category, description: 'Estimate adult body fat from BMI, age and sex using the Deurenberg equation.', keywords: ['body composition', 'fat percentage', 'deurenberg'],
    fields: metabolicFields, formula: 'Body fat % = 1.20 × BMI + 0.23 × age − 10.8 × sex − 5.4, using 1 for male and 0 for female.',
    note: 'This regression can be inaccurate for some people, including at BMI extremes and with unusually high muscle mass.',
    calculate: ({ weight, height, age, sex }) => {
      const value = 1.2 * bmi(weight, height) + .23 * age - (sex === 'male' ? 10.8 : 0) - 5.4
      requireInput(value > 0 && value < 100, 'The supplied measurements are outside this formula’s useful range.')
      return result(percent('Estimated body fat', Number(value.toFixed(1))), line('Estimated fat mass', Number((weight * value / 100).toFixed(1)), 'kg'))
    } }),
  define({ id: 'bmr-calculator', title: 'BMR Calculator', category, description: 'Estimate the daily energy your body uses at rest.', keywords: ['basal metabolic rate', 'resting metabolic rate', 'RMR', 'Mifflin St Jeor'],
    fields: metabolicFields, formula: bmrFormula, note: bmrNote,
    calculate: ({ weight, height, age, sex }) => result(wholeEnergy('Estimated resting energy', restingCalories(weight,height,age,sex))) }),
  define({ id: 'tdee-calculator', title: 'TDEE Calculator', category, description: 'Estimate total daily energy expenditure from your resting metabolism and activity.', keywords: ['maintenance calories', 'total daily energy expenditure', 'metabolism'],
    fields: [...metabolicFields, activity], formula: `${bmrFormula} ${activityFormula}`, note: bmrNote,
    calculate: ({ weight, height, age, sex, activity }) => {
      const base = restingCalories(weight,height,age,sex)
      return result(wholeEnergy('Estimated daily energy use', base * Number(activity)), wholeEnergy('Estimated resting energy', base), line('Activity factor', Number(activity)))
    } }),
  define({ id: 'daily-calorie-estimate', title: 'Daily Calorie Estimate', category, description: 'Compare estimated maintenance calories with a custom daily energy adjustment.', keywords: ['calorie needs', 'maintenance', 'calorie deficit', 'calorie surplus'],
    fields: [...metabolicFields, activity, whole('adjustment','Daily adjustment (kcal)', 0, -1000, 1000)],
    formula: `${activityFormula} Add the selected adjustment to this maintenance estimate. Resting metabolism uses Mifflin–St Jeor.`,
    note: 'Adjustment is for comparison. Individual energy needs and suitable intake can differ from model estimates.',
    calculate: ({ weight, height, age, sex, activity, adjustment }) => {
      const maintenance = restingCalories(weight,height,age,sex) * Number(activity)
      requireInput(maintenance + adjustment > 0, 'This adjustment would give a nonpositive estimate.', 'adjustment')
      return result(wholeEnergy('Adjusted calorie estimate', maintenance + adjustment), wholeEnergy('Estimated maintenance', maintenance))
    } }),
  define({ id: 'water-intake-estimate', title: 'Water Intake Estimate', category, description: 'See an adult population reference for total water from food and drinks.', keywords: ['hydration', 'daily water', 'litres'],
    fields: [select('reference','Adult reference group','female',[option('female','Women'),option('male','Men')]),
      select('volume','Glass size','250',[option('200','200 mL'),option('250','250 mL'),option('300','300 mL'),option('500','500 mL')])],
    formula: 'National Academies reference intakes are 2.7 L/day for women and 3.7 L/day for men, including all beverages and moisture in food.',
    note: 'The reference is for generally healthy, nonpregnant adults in temperate conditions. Individual needs vary with heat, exercise and medical conditions.',
    calculate: ({ reference, volume }) => {
      const litres = reference === 'female' ? 2.7 : 3.7
      return result(line('Total water reference', litres, 'L/day'), line('Equivalent glass volumes', Number((litres * 1000 / Number(volume)).toFixed(1)), 'glasses'))
    } }),
  define({ id: 'pregnancy-due-date-calculator', title: 'Pregnancy Due Date Calculator', category, description: 'Estimate a due date from the first day of the last menstrual period.', keywords: ['estimated delivery date', 'LMP', 'gestation'],
    fields: [txt('start','First day of last menstrual period','2026-05-01',{ kind: 'date' }), whole('cycle','Typical cycle length (days)',28,21,35)],
    formula: 'Estimated due date = last menstrual period start + 280 days + (cycle length − 28 days).',
    note: 'Uses a regular-cycle assumption. Clinical dating, including early ultrasound, may give a different date.',
    calculate: ({ start, cycle }) => result(line('Estimated due date', displayDate(parseDate(start, 'start') + (280 + cycle - 28) * dayMs))) }),
  define({ id: 'sleep-cycle-calculator', title: 'Sleep Cycle Calculator', category, description: 'Explore approximate bedtimes or wake times using a chosen sleep-cycle length.', keywords: ['bedtime', 'wake up', 'REM', 'sleep schedule'],
    fields: [select('mode','Plan from','wake',[option('wake','Desired wake-up time'),option('bed','Planned bedtime')]),
      txt('time','Clock time','07:00',{ kind: 'time' }),whole('latency','Time to fall asleep (minutes)', 15, 0,120),
      whole('cycle','Estimated cycle length (minutes)',90,80,100), whole('count','Preferred cycles',5,4,6)],
    formula: 'Add or subtract the time to fall asleep plus cycle length × cycle count. Clock results wrap across midnight.',
    note: 'Cycle lengths vary within and between nights. These times illustrate the model and cannot predict individual sleep stages.',
    calculate: ({ mode, time, latency, cycle, count }) => {
      const start = parseClock(time, 'time')
      const at = (n: number) => clock(start + (mode === 'wake' ? -1 : 1) * (latency + cycle * n) * 60)
      return result(line(mode === 'wake' ? 'Estimated bedtime' : 'Estimated wake-up time', at(count)),
        ...[4,5,6].filter(n => n !== count).map(n => line(`With ${n} cycles`, at(n))), line('Estimated sleep duration', count * cycle / 60, 'hours'))
    } }),
  define({ id: 'running-pace-calculator', title: 'Running Pace Calculator', category, description: 'Find your pace per kilometre and mile and your average speed.', keywords: ['running speed', 'min/km', 'marathon pace', 'race time'],
    fields: [pos('distance','Distance', 5), select('unit','Distance unit','km',[option('km','Kilometres'),option('mi','Miles')]), pos('minutes','Elapsed time (minutes)',26.5)],
    formula: 'Pace = elapsed time ÷ distance. Speed = distance ÷ elapsed hours. One mile equals 1.609344 km.',
    calculate: ({ distance, unit, minutes }) => {
      const km = unit === 'km' ? distance : distance * 1.609344
      const pace = minutes * 60 / km
      return result(line('Pace per kilometre', `${duration(pace)} min/km`), line('Pace per mile', `${duration(pace * 1.609344)} min/mi`), line('Average speed', km / minutes * 60, 'km/h'))
    } }),
  define({ id: 'body-surface-area-calculator', title: 'Body Surface Area Calculator', category, description: 'Estimate human body surface area using the Mosteller formula.', keywords: ['BSA', 'Mosteller', 'height weight'],
    fields: [height,weight], formula: 'Body surface area in m² = √(height in cm × weight in kg ÷ 3600).',
    calculate: ({ height, weight }) => result(line('Estimated body surface area', Number(Math.sqrt(height * weight / 3600).toFixed(3)), 'm²')) }),
]
