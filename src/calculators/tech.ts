import { define, InputError, line, nonneg, num, option, percent, pos, requireInput, result, select, showFor, txt, whole } from './core'
import type { MatchSummary } from './regex'

const category = 'tech'
const ipv4 = (address: string, field: string) => {
  const parts = address.trim().split('.')
  requireInput(parts.length === 4 && parts.every(part => /^(?:0|[1-9]\d{0,2})$/.test(part) && Number(part) <= 255),
    'Enter four decimal octets from 0 to 255, without leading zeros.', field)
  return parts.reduce((value, part) => (value << 8n) + BigInt(part), 0n)
}
const dotted = (value: bigint) => [24n,16n,8n,0n].map(shift => String((value >> shift) & 255n)).join('.')
const full32 = 0xffffffffn

export function subnet(address: string, prefix: number, field = 'address') {
  const ip = ipv4(address, field)
  const total = 2 ** (32 - prefix)
  const wildcard = BigInt(total - 1)
  const mask = full32 ^ wildcard
  const network = ip & mask
  const last = network | wildcard
  const range = prefix < 31 ? `${dotted(network + 1n)} – ${dotted(last - 1n)}` : prefix === 31 ? `${dotted(network)} – ${dotted(last)}` : dotted(ip)
  return result(line('Network CIDR', `${dotted(network)}/${prefix}`),line('Subnet mask', dotted(mask)),line('Wildcard mask', dotted(wildcard)),
    line(prefix < 31 ? 'Broadcast address' : 'Highest address', dotted(last)),line('Host address range', range),
    line('Total addresses', total), line('Usable addresses', prefix < 31 ? total - 2 : total))
}
const subnetFormula = 'The prefix sets the leftmost mask bits. Bitwise AND gives the network address and setting every host bit gives the highest address.'
const subnetNote = 'For /0–/30, exclude network and broadcast addresses from the host count. /31 assumes a point-to-point link. /32 represents one host route.'
const bases = Array.from({ length: 35 }, (_, index) => option(String(index + 2), ({ 2:'Binary (2)', 8:'Octal (8)', 10:'Decimal (10)', 16:'Hexadecimal (16)' } as Record<number,string>)[index + 2] ?? `Base ${index + 2}`))
const digits = '0123456789abcdefghijklmnopqrstuvwxyz'

export function convertBase(input: string, from: number, to: number) {
  const trimmed = input.trim().toLowerCase()
  const sign = trimmed.startsWith('-') ? -1n : 1n
  let text = /^[+-]/.test(trimmed) ? trimmed.slice(1) : trimmed
  const prefix = ({ 2:'0b', 8:'0o', 16:'0x' } as Record<number,string>)[from]
  if (prefix && text.startsWith(prefix)) text = text.slice(2)
  requireInput(text.length > 0 && /^[0-9a-z]+$/.test(text), 'Enter a whole number using digits and letters for the selected base.', 'value')
  let value = 0n
  for (const digit of text) {
    const part = digits.indexOf(digit)
    requireInput(part < from, `The digit “${digit.toUpperCase()}” is invalid in base ${from}.`, 'value')
    value = value * BigInt(from) + BigInt(part)
  }
  return (value * sign).toString(to).toUpperCase()
}

const sizeUnits = [
  option('1000000','MB (decimal)'),option('1000000000','GB (decimal)'),option('1000000000000','TB (decimal)'),
  option('1048576','MiB (binary)'),option('1073741824','GiB (binary)'),option('1099511627776','TiB (binary)'),
]
const fileSize = pos('size','File size',10)
const fileUnit = select('sizeUnit','File-size unit','1000000000',sizeUnits)
const efficiency = num('efficiency','Transfer efficiency (%)', 85, { min: Number.MIN_VALUE, max: 100 })
function clockDuration(seconds: number) {
  requireInput(Number.isFinite(seconds) && seconds > 0 && seconds <= Number.MAX_SAFE_INTEGER, 'The calculated duration is outside the supported range.')
  if (seconds < 1) return `${Number((seconds * 1000).toPrecision(5))} ms`
  const rounded = Math.ceil(seconds)
  return `${Math.floor(rounded / 3600)} h ${Math.floor(rounded / 60) % 60} min ${rounded % 60} s`
}
const characterSets = {
  lower: 'abcdefghijklmnopqrstuvwxyz', upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', numbers: '0123456789', symbols: '!@#$%^&*()-_=+[]{}:,.?/',
}
function secureRandom() {
  requireInput(typeof globalThis.crypto?.getRandomValues === 'function', 'Secure randomness is unavailable in this browser.')
  const bytes = new Uint8Array(256)
  let index = bytes.length
  return (length: number): number => {
    const limit = Math.floor(256 / length) * length
    for (;;) {
      if (index === bytes.length) {
        globalThis.crypto.getRandomValues(bytes)
        index = 0
      }
      const byte = bytes[index++]
      if (byte < limit) return byte % length
    }
  }
}

export function generatePassword(length: number, sets: string[]) {
  requireInput(sets.length > 0 && length >= sets.length, 'Select at least one character set that fits the length.')
  const pool = sets.join('')
  const randomIndex = secureRandom()
  // Reject entire candidates to sample uniformly from passwords that meet the policy.
  for (;;) {
    const password = Array.from({ length }, () => pool[randomIndex(pool.length)]).join('')
    if (sets.every(set => [...password].some(character => set.includes(character)))) return password
  }
}

export async function sha256(value: string) {
  requireInput(globalThis.crypto?.subtle, 'SHA-256 requires localhost or another secure browser context.')
  const bytes = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2,'0')).join('')
}

export function formatJson(source: string, spacing: string) {
  try { JSON.parse(source) } catch (error) {
    throw new InputError(error instanceof Error ? error.message : 'The input is invalid JSON.', 'source')
  }
  const tokens = source.match(/"(?:[^"\\]|\\[\s\S])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null|[{}\[\],:]/g) ?? []
  if (spacing === 'compact') return tokens.join('')
  const separator = spacing === 'tab' ? '\t' : ' '.repeat(Number(spacing))
  let depth = 0
  const indent = () => '\n' + separator.repeat(depth)
  return tokens.map((token, index) => {
    const previous = tokens[index - 1]
    const next = tokens[index + 1]
    if (token === '{' || token === '[') {
      depth++
      requireInput(depth <= 100, 'Pretty printing supports up to 100 nested levels.', 'source')
      return token + (next === '}' || next === ']' ? '' : indent())
    }
    if (token === '}' || token === ']') {
      depth--
      return (previous === '{' || previous === '[' ? '' : indent()) + token
    }
    if (token === ',') return token + indent()
    return token === ':' ? ': ' : token
  }).join('')
}

function runRegex(pattern: string, flags: string, source: string): Promise<MatchSummary> {
  requireInput(typeof Worker === 'function', 'This browser does not support background regex evaluation.')
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./regex.worker.ts', import.meta.url), { type: 'module' })
    const finish = () => { clearTimeout(timeout); worker.terminate() }
    const timeout = setTimeout(() => {
      finish()
      reject(new InputError('This pattern took too long. Simplify it or shorten the test text.', 'pattern'))
    }, 1200)
    worker.onmessage = (event: MessageEvent<{ result?: MatchSummary; error?: string }>) => {
      finish()
      if (event.data.result) resolve(event.data.result)
      else reject(new InputError(event.data.error ?? 'Could not read the regex result.', 'pattern'))
    }
    worker.onerror = event => {
      event.preventDefault()
      finish()
      reject(new InputError('The regex worker could not start. Refresh the page and try again.'))
    }
    worker.postMessage({ pattern, flags, source })
  })
}

const yesNo = <K extends string>(key: K, label: string) => select(key,label,'yes',[option('yes','Include'),option('no','Exclude')])

export const techCalculators = [
  define({ id: 'ip-subnet-calculator', title: 'IPv4 Subnet Calculator', category, description: 'Find the IPv4 network, subnet mask, broadcast address and host range.', keywords: ['IP address', 'subnetting', 'netmask', 'wildcard mask', 'CIDR'],
    fields: [txt('address','IPv4 address','192.168.1.42',{maxLength: 20}),whole('prefix','Prefix length',24,0,32)],
    formula: subnetFormula, note: subnetNote, calculate: ({ address, prefix }) => subnet(address,prefix) }),
  define({ id: 'cidr-calculator', title: 'CIDR Calculator', category, description: 'Expand IPv4 CIDR notation into its network and address range.', keywords: ['CIDR block', 'slash notation', 'range', 'subnet'],
    fields: [txt('cidr','IPv4 CIDR block','10.0.5.129/26',{maxLength: 24})], formula: subnetFormula, note: subnetNote,
    calculate: ({ cidr }) => {
      const match = cidr.trim().match(/^([^/]+)\/(0|[1-9]\d?)$/)
      requireInput(match && Number(match[2]) <= 32, 'Use IPv4 CIDR notation, such as 10.0.0.0/24.', 'cidr')
      return subnet(match[1], Number(match[2]), 'cidr')
    } }),
  define({ id: 'bandwidth-calculator', title: 'Bandwidth Calculator', category, description: 'Estimate the connection bandwidth required for a transfer deadline.', keywords: ['network throughput', 'data rate', 'upload speed', 'Mbps'],
    fields: [fileSize,fileUnit,pos('minutes','Transfer deadline (minutes)',10),efficiency],
    formula: 'Required link Mbps = bytes × 8 ÷ (seconds × 1,000,000 × efficiency). Both Mbps and MB/s use decimal units.',
    note: 'Efficiency represents the share of connection speed available to payload data.',
    calculate: ({ size, sizeUnit, minutes, efficiency }) => {
      const rate = (size / minutes) * ((Number(sizeUnit) / 1e6) * (8 / 60) / (efficiency / 100))
      requireInput(rate > 0, 'The bandwidth result is too small to represent.')
      return result(line('Required link bandwidth', rate, 'Mbps'),line('Equivalent link bandwidth', rate / 8, 'MB/s'))
    } }),
  define({ id: 'download-time-calculator', title: 'Download Time Calculator', category, description: 'Estimate transfer time from file size and connection speed.', keywords: ['file download', 'upload time', 'internet speed'],
    fields: [fileSize,fileUnit,pos('rate','Connection speed (Mbps)',100),efficiency],
    formula: 'Seconds = file bytes × 8 ÷ (nominal Mbps × 1,000,000 × efficiency).',
    note: 'Assumes constant throughput. The hour/minute/second result rounds up to the next second for downloads of at least one second.',
    calculate: ({ size, sizeUnit, rate, efficiency }) => {
      const payload = rate * (efficiency / 100)
      const seconds = (size / payload) * (Number(sizeUnit) / 1e6 * 8)
      return result(line('Estimated transfer time', clockDuration(seconds)),line('Total seconds', seconds, 's'),line('Effective throughput', payload, 'Mbps'))
    } }),
  define({ id: 'storage-capacity-calculator', title: 'Storage Capacity Calculator', category, description: 'Estimate how many files of a given size fit on a drive after reserving space.', keywords: ['disk capacity', 'number of files', 'storage space', 'SSD'],
    fields: [pos('capacity','Drive capacity',1),select('capacityUnit','Drive unit','1000000000000',sizeUnits),pos('size','Typical file size',25),
      select('unit','File-size unit','1000000',sizeUnits),num('reserve','Space set aside (%)',10,{ min: 0, max: 100 })],
    formula: 'Convert drive capacity and file size to decimal MB. Subtract reserved space and round the usable-capacity-to-file-size ratio down.',
    note: 'Models equal-size files. Reserve space for formatting, file-system overhead and other data.',
    calculate: ({ capacity, capacityUnit, size, unit, reserve }) => {
      const usable = capacity * (Number(capacityUnit) / 1e6) * (1 - reserve / 100)
      const files = Math.floor(usable / (size * (Number(unit) / 1e6)))
      requireInput(Number.isSafeInteger(files), 'The file count is outside the exact whole-number range.')
      return result(line('Files that fit', String(files)),line('Usable capacity', usable / 1000, 'GB'),percent('Reserved', reserve))
    } }),
  define({ id: 'binary-to-decimal', title: 'Binary to Decimal Converter', category, description: 'Convert signed binary integers to exact decimal values.', keywords: ['bits', 'base 2 to base 10', '0b'],
    fields: [txt('value','Binary integer','110101',{maxLength: 512})], formula: 'Each digit contributes its value times 2 raised to its position from the right.',
    calculate: ({ value }) => result(line('Decimal integer', convertBase(value,2,10))) }),
  define({ id: 'decimal-to-hexadecimal', title: 'Decimal to Hexadecimal Converter', category, description: 'Convert a signed decimal integer into hexadecimal.', keywords: ['hex', 'base 10 to base 16', '0x'],
    fields: [txt('value','Decimal integer','4095',{maxLength: 512})], formula: 'Divide the decimal value by 16 repeatedly. Read the remainders in reverse, using A–F for 10–15.',
    calculate: ({ value }) => result(line('Hexadecimal integer', convertBase(value,10,16))) }),
  define({ id: 'number-base-converter', title: 'Number Base Converter', category, description: 'Convert exact whole numbers between any two bases from 2 through 36.', keywords: ['binary', 'octal', 'decimal', 'hexadecimal', 'radix'],
    fields: [txt('value','Integer','255',{maxLength: 512}),select('from','Source base','10',bases),select('to','Target base','16',bases)],
    formula: 'Read each source digit by its place value, then write the exact integer in the target base. Letters A–Z represent values 10–35.',
    faq: { question: 'Which number formats can I enter?', answer: 'Use a signed or unsigned integer. Common 0b, 0o and 0x prefixes are accepted for their matching bases.' },
    calculate: ({ value, from, to }) => result(line(`Base ${to} integer`,convertBase(value,Number(from),Number(to)))) }),
  define({ id: 'hex-to-rgb', title: 'HEX to RGB Converter', category, description: 'Convert 3-digit or 6-digit HEX color notation to RGB and CSS values.', keywords: ['color converter', 'hex colour', 'CSS rgb'],
    fields: [txt('value','HEX color','#6955E8',{maxLength: 12})], formula: 'Expand each digit of shorthand HEX twice, then convert each pair from hexadecimal to a number from 0–255.',
    calculate: ({ value }) => {
      let hex = value.trim().replace(/^#/,'')
      requireInput(/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex), 'Enter a 3- or 6-digit HEX color, such as #6955E8.', 'value')
      if (hex.length === 3) hex = [...hex].map(char => char + char).join('')
      const [red, green, blue] = hex.match(/../g)!.map(part => parseInt(part,16))
      return result(line('CSS RGB', `rgb(${red}, ${green}, ${blue})`),line('Normalized HEX', `#${hex.toUpperCase()}`),line('RGB channels', `${red} · ${green} · ${blue}`))
    } }),
  define({ id: 'rgb-to-hsl', title: 'RGB to HSL Converter', category, description: 'Turn RGB channel values into hue, saturation and lightness.', keywords: ['color space', 'css hsl', 'colour'],
    fields: [whole('r','Red',105,0,255),whole('g','Green',85,0,255),whole('b','Blue',232,0,255)],
    formula: 'Normalize channels to 0–1. Lightness is the average of the highest and lowest channel. Chroma and the dominant channel determine saturation and hue.',
    calculate: ({ r, g, b }) => {
      const [red, green, blue] = [r,g,b].map(value => value / 255)
      const min = Math.min(red,green,blue)
      const max = Math.max(red,green,blue)
      const delta = max - min
      const lightness = (max + min) / 2
      const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1))
      const channel = delta === 0 ? 0 : max === red ? (green - blue) / delta : max === green ? (blue - red) / delta + 2 : (red - green) / delta + 4
      const hue = Number(((channel * 60 + 360) % 360).toFixed(2)) % 360
      return result(line('CSS HSL', `hsl(${hue}, ${Number((saturation * 100).toFixed(2))}%, ${Number((lightness * 100).toFixed(2))}%)`))
    } }),
  define({ id: 'password-generator', title: 'Password Generator', category, description: 'Create a random password locally with configurable length and character sets.', keywords: ['secure password', 'random string', 'credentials'],
    fields: [whole('length','Password length',20,8,128),yesNo('lower','Lowercase letters'),yesNo('upper','Uppercase letters'),
      yesNo('numbers','Numbers'),yesNo('symbols','Symbols')], privateResult: true,
    formula: 'Sample characters using the browser’s cryptographic random generator. Retry candidates until each enabled character set is represented.',
    example: 'A 20-character password with all four sets contains at least one uppercase letter, one lowercase letter, one digit and one symbol.',
    calculate: ({ length, ...selection }) => {
      const sets = (Object.keys(characterSets) as (keyof typeof characterSets)[]).filter(key => selection[key] === 'yes').map(key => characterSets[key])
      return result(line('Generated password', generatePassword(length,sets)),line('Length', length, 'characters'))
    } }),
  define({ id: 'sha-256-hash-generator', title: 'SHA-256 Hash Generator', category, description: 'Compute a SHA-256 digest for text using local Web Crypto.', keywords: ['checksum', 'sha256', 'digest', 'hash text'],
    fields: [txt('value','Input text','abc',{kind:'textarea',optional:true,maxLength:50000,help:'Spaces, newlines and an empty string are valid inputs.'})], privateResult: true,
    formula: 'Encode the input as UTF-8, apply SHA-256, and display the 256-bit digest as 64 hexadecimal characters.',
    example: 'abc → ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    calculate: async ({ value }) => result(line('SHA-256 digest', await sha256(value))) }),
  define({ id: 'json-formatter-validator', title: 'JSON Formatter and Validator', category, description: 'Check JSON syntax, pretty-print it, or compact it into a single line.', keywords: ['json prettify', 'minify', 'syntax check'],
    fields: [txt('source','JSON input','{"name":"CalcSpace","items":[1,2,3]}',{kind:'textarea',maxLength:50000}),
      select('spacing','Formatting','2',[option('2','2 spaces'),option('4','4 spaces'),option('tab','Tabs'),option('compact','Compact')])], privateResult: true,
    formula: 'Validate using standard JSON syntax, then reformat tokens. Large numeric literals, key ordering and duplicated keys retain their original spelling.',
    calculate: ({ source, spacing }) => result(line('Formatted JSON', formatJson(source,spacing)),line('Validation','Valid JSON')) }),
  define({ id: 'regex-tester', title: 'Regex Tester', category, description: 'Try a JavaScript regular expression and inspect its matches and capture groups.', keywords: ['regular expression', 'pattern match', 'regexp', 'capture groups'],
    fields: [txt('pattern','Pattern','\\b\\d+\\b',{optional:true,maxLength:500,help:'Enter the expression without surrounding slashes.'}),
      txt('flags','Flags','g',{optional:true,maxLength:8,help:'Examples: i for case-insensitive, m for multiline.'}),
      txt('source','Test text','Invoice 42 contains 3 items.',{kind:'textarea',optional:true,maxLength:12000})],
    privateResult: true, formula: 'Use JavaScript regular expression semantics. Scan globally and report up to 100 matches with zero-based offsets. A time limit keeps the page responsive.',
    example: 'The pattern \\b\\d+\\b matches 42 and 3 in “Invoice 42 contains 3 items.”',
    calculate: async ({ pattern, flags, source }) => {
      const matches = await runRegex(pattern, flags.trim(), source)
      return result(line('Matches', matches.truncated ? '100+' : matches.count),line('Match details', matches.detail || 'No matches'))
    } }),
]
