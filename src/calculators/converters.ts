import { define, line, nonneg, num, option, requireInput, result, select } from './core'

type Unit = { key: string; name: string; symbol: string; factor: number }
const unit = (key: string, name: string, symbol: string, factor: number): Unit => ({ key, name, symbol, factor })
const choices = (units: readonly Unit[]) => units.map(({ key, name, symbol }) => option(key, `${name} (${symbol})`))
const byKey = (units: readonly Unit[], key: string) => units.find(unit => unit.key === key)!
const category = 'convert'
const group = 'converters'

const length = [
  unit('mm','Millimetres','mm', .001), unit('cm','Centimetres','cm', .01), unit('m','Metres','m',1),
  unit('km','Kilometres','km',1000), unit('in','Inches','in',.0254), unit('ft','Feet','ft',.3048),
  unit('yd','Yards','yd',.9144), unit('mi','Miles','mi',1609.344), unit('nmi','Nautical miles','nmi',1852),
]
const weight = [
  unit('mg','Milligrams','mg',.000001), unit('g','Grams','g',.001), unit('kg','Kilograms','kg',1), unit('t','Metric tonnes','t',1000),
  unit('oz','Ounces','oz',.028349523125), unit('lb','Pounds','lb',.45359237), unit('st','Stones','st',6.35029318),
]
const sqft = .09290304
const area = [
  unit('cm2','Square centimetres','cm²',.0001), unit('m2','Square metres','m²',1), unit('km2','Square kilometres','km²',1000000),
  unit('ft2','Square feet','ft²',sqft), unit('yd2','Square yards','yd²',.83612736), unit('ha','Hectares','ha',10000),
  unit('acre','Acres','ac',43560 * sqft), unit('guntha','Guntha','guntha',1089 * sqft),
]
const volume = [
  unit('ml','Millilitres','mL',.001), unit('l','Litres','L',1), unit('m3','Cubic metres','m³',1000),
  unit('us-gal','US gallons','US gal',3.785411784), unit('imp-gal','Imperial gallons','imp gal',4.54609), unit('fl-oz','US fluid ounces','US fl oz',.0295735295625),
  unit('ft3','Cubic feet','ft³',28.316846592),
]
const speed = [
  unit('mps','Metres per second','m/s',1), unit('kph','Kilometres per hour','km/h',1000 / 3600),
  unit('mph','Miles per hour','mph',1609.344 / 3600), unit('knot','Knots','kn',1852 / 3600), unit('fps','Feet per second','ft/s',.3048),
]
const time = [
  unit('ms','Milliseconds','ms',.001), unit('s','Seconds','s',1), unit('min','Minutes','min',60), unit('h','Hours','h',3600),
  unit('day','Days','d',86400), unit('week','Weeks','wk',604800),
]
const storage = [
  unit('bit','Bits','bit',.125), unit('b','Bytes','B',1), unit('kb','Kilobytes','kB',1e3), unit('mb','Megabytes','MB',1e6),
  unit('gb','Gigabytes','GB',1e9), unit('tb','Terabytes','TB',1e12), unit('pb','Petabytes','PB',1e15),
  unit('kib','Kibibytes','KiB',2 ** 10), unit('mib','Mebibytes','MiB',2 ** 20), unit('gib','Gibibytes','GiB',2 ** 30),
  unit('tib','Tebibytes','TiB',2 ** 40), unit('pib','Pebibytes','PiB',2 ** 50),
]
const dataRate = [unit('mbps','Megabits per second','Mbps',1), unit('MBs','Megabytes per second','MB/s',8)]

export function convertValue(value: number, from: number, to: number) {
  const converted = value * (from / to)
  requireInput(value === 0 || converted !== 0, 'The converted value is too small to represent.')
  return converted
}

function flexible(id: string, title: string, description: string, units: readonly Unit[], start: number, from: string, to: string,
  keywords: string[], detail = 'Multiply by the source unit’s factor and divide by the target unit’s factor.') {
  return define({ id, title, description, category, group, keywords, fields: [nonneg('value','Value', start),
    select('from','From',from,choices(units)), select('to','To',to,choices(units))], formula: detail,
    calculate: input => {
      const source = byKey(units, input.from)
      const target = byKey(units, input.to)
      return result(line('Converted value', convertValue(input.value, source.factor, target.factor), target.symbol))
    } })
}

function fixed(id: string, title: string, description: string, units: readonly Unit[], a: string, b: string, initial: number, keywords: string[], note?: string) {
  const from = byKey(units, a)
  const to = byKey(units, b)
  const factor = Number((from.factor / to.factor).toPrecision(12))
  return define({ id, title, description, category, group, keywords, note,
    fields: [nonneg('value',`Value in ${from.symbol}`, initial)],
    formula: `Multiply the input by ${factor} to convert ${from.symbol} to ${to.symbol}.`,
    calculate: ({ value }) => result(line(`Value in ${to.symbol}`, convertValue(value, from.factor, to.factor), to.symbol)) })
}

const temperatures = [option('c','Celsius (°C)'), option('f','Fahrenheit (°F)'), option('k','Kelvin (K)')]
export function convertTemperature(value: number, from: string, to: string) {
  const zero = { c: -273.15, f: -459.67, k: 0 }
  requireInput(value >= zero[from as keyof typeof zero], 'Temperature cannot be below absolute zero.', 'value')
  if (from === to) return value
  if (from === 'c') return to === 'f' ? value * 1.8 + 32 : value + 273.15
  if (from === 'f') return to === 'c' ? (value - 32) / 1.8 : (value + 459.67) / 1.8
  return to === 'c' ? value - 273.15 : value * 1.8 - 459.67
}

export const converterCalculators = [
  flexible('length-converter','Length Converter','Convert distances in metric, imperial and nautical units.', length, 10,'ft','m',['distance', 'length', 'metre', 'feet inches']),
  fixed('feet-to-meter','Feet to Meter','Convert measurements in feet to meters.',length,'ft','m',10,['ft to m', 'metre', 'height']),
  fixed('inches-to-centimeter','Inches to Centimeter','Convert inches to centimeters for dimensions and measurements.',length,'in','cm',12,['in to cm', 'centimetre', 'height']),
  fixed('kilometer-to-mile','Kilometer to Mile','Convert kilometres to international miles for routes and distances.',length,'km','mi',10,['km to mi', 'kilometre', 'travel']),
  flexible('weight-converter','Weight Converter','Convert mass between metric and common imperial units.',weight,70,'kg','lb',['mass', 'grams', 'kilo pound']),
  fixed('kilogram-to-pound','Kilogram to Pound','Convert kilograms to avoirdupois pounds.',weight,'kg','lb',10,['kg to lb', 'weight', 'mass']),
  define({ id: 'temperature-converter', title: 'Temperature Converter', category, group,
    description: 'Convert Celsius, Fahrenheit and Kelvin temperatures.', keywords: ['c to f', 'centigrade', 'weather'],
    fields: [num('value','Temperature', 25),select('from','From','c',temperatures),select('to','To','f',temperatures)],
    formula: '°F = °C × 9/5 + 32. K = °C + 273.15. The lowest possible temperature is 0 K.',
    calculate: ({ value, from, to }) => result(line('Converted temperature', convertTemperature(value, from, to), ({ c:'°C', f:'°F', k:'K' } as Record<string,string>)[to])) }),
  flexible('area-converter','Area Converter','Convert land and floor areas across metric, imperial and Indian units.',area,1,'acre','guntha',
    ['land area', 'guntha', 'gunta', 'acre', 'square feet', 'hectare']),
  fixed('square-feet-to-square-meter','Square Feet to Square Meter','Translate floor plans and listings from square feet to square meters.',area,'ft2','m2',1000,['sq ft to sq m', 'sqm', 'floor area']),
  fixed('acre-to-guntha','Acre to Guntha','Convert acres into guntha for land measurements.',area,'acre','guntha',2,['gunta', 'plot', 'land area'], 'Uses the convention 1 guntha = 1,089 square feet.'),
  fixed('acre-to-square-feet','Acre to Square Feet','Convert plot sizes in acres to square feet.',area,'acre','ft2',2,['ac to sqft', 'farm land', 'property']),
  flexible('volume-converter','Volume Converter','Convert liquid volumes and cubic measurements.',volume,5,'l','us-gal',['litre', 'capacity', 'gallon', 'fluid ounces']),
  flexible('speed-converter','Speed Converter','Convert vehicle, running and nautical speeds.',speed,100,'kph','mph',['kilometres per hour', 'miles per hour', 'knots', 'velocity']),
  flexible('time-converter','Time Converter','Convert fixed durations from milliseconds to weeks.',time,48,'h','day',['duration', 'hours minutes', 'seconds days'], 'Convert through seconds. A day is fixed at 24 hours and a week at 7 days.'),
  flexible('digital-storage-converter','Digital Storage Converter','Convert between bits, bytes, decimal storage units and binary units.',storage,1024,'mib','gib',['disk size', 'MB GB', 'MiB GiB', '1024'],
    'Convert through bytes. Each decimal step is 1,000 and each binary step is 1,024. One byte contains 8 bits.'),
  fixed('mb-to-gb','MB to GB','Convert decimal megabytes to decimal gigabytes.',storage,'mb','gb',1500,['megabyte', 'gigabyte', 'storage units'], 'Uses 1 GB = 1,000 MB. Select MiB and GiB in Digital Storage Converter for binary units.'),
  fixed('mbps-to-mb-s','Mbps to MB/s','Convert connection speeds in megabits per second to megabytes per second.',dataRate,'mbps','MBs',100,
    ['internet speed', 'bandwidth', 'megabits megabytes', 'mbps to mbps']),
]
