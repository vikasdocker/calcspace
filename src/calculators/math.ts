import { define, line, nonneg, num, option, percent, pos, requireInput, result, select, showFor, txt, whole } from './core'
import { evaluateExpression } from './expression'

export function gcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) [a, b] = [b, a % b]
  return a < 0n ? -a : a
}

function integerList(value: string): bigint[] {
  const pieces = value.trim().split(/[\s,]+/)
  requireInput(pieces.length >= 2 && pieces.length <= 30 && pieces.every(piece => /^[+-]?\d{1,60}$/.test(piece)), 'Enter 2–30 integers with up to 60 digits each.', 'numbers')
  return pieces.map(piece => BigInt(piece))
}

function factorize(value: number) {
  const factors: number[] = []
  for (let factor = 2; factor <= value / factor; factor += factor === 2 ? 1 : 2) {
    while (value % factor === 0) {
      factors.push(factor)
      value /= factor
    }
  }
  if (value > 1) factors.push(value)
  return factors
}

function readFraction(value: string, field: string): [bigint, bigint] {
  const match = value.trim().match(/^([+-]?\d{1,60})(?:\s*\/\s*([+-]?\d{1,60}))?$/)
  requireInput(match, 'Use an integer or a fraction such as 3/4.', field)
  const denominator = BigInt(match[2] ?? '1')
  requireInput(denominator !== 0n, 'The denominator cannot be zero.', field)
  return [BigInt(match[1]), denominator]
}

export function changePercent(previous: number, next: number) {
  requireInput(previous !== 0, 'The starting value must be nonzero.')
  return (next - previous) / Math.abs(previous) * 100
}

const sides = [pos('a', 'Side a', 3), pos('b', 'Side b', 4), pos('c', 'Side c', 5)] as const
function triangle(a: number, b: number, c: number) {
  const [small, middle, large] = [a, b, c].sort((left, right) => left - right)
  requireInput(small > large - middle, 'These sides cannot form a triangle.')
  const perimeter = a + b + c
  // Kahan’s rearrangement of Heron’s formula reduces cancellation.
  const area = Math.sqrt(large + (middle + small)) * Math.sqrt(small - (large - middle))
    * Math.sqrt(small + (large - middle)) * Math.sqrt(large + (middle - small)) / 4
  return { area, perimeter }
}

function readMatrix(text: string, field: string): number[][] {
  const matrix = text.trim().split(/\r?\n|;/).map(row => row.trim().split(/\s*,\s*|\s+/).map(token => {
    const value = Number(token)
    requireInput(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(token) && Number.isFinite(value)
      && (value !== 0 || !/[1-9]/.test(token.split(/e/i)[0])), 'Use finite decimal numbers separated by spaces or commas.', field)
    return value
  }))
  requireInput(matrix.length <= 8 && matrix[0].length <= 8 && matrix.every(row => row.length === matrix[0].length), 'Use a rectangular matrix up to 8 × 8.', field)
  return matrix
}

function eliminate(matrix: number[][], inverse: boolean) {
  const size = matrix.length
  requireInput(matrix[0].length === size, 'Use a square matrix for this operation.', 'a')
  const augmented = matrix.map((row, i) => inverse ? [...row, ...row.map((_, j) => Number(i === j))] : [...row])
  let determinant = 1
  for (let col = 0; col < size; col++) {
    let pivot = col
    for (let row = col + 1; row < size; row++) {
      if (Math.abs(augmented[row][col]) > Math.abs(augmented[pivot][col])) pivot = row
    }
    const scale = augmented[pivot][col]
    if (scale === 0) {
      requireInput(!inverse, 'This matrix is singular and has no inverse.', 'a')
      return { determinant: 0, matrix: augmented }
    }
    if (pivot !== col) {
      [augmented[col], augmented[pivot]] = [augmented[pivot], augmented[col]]
      determinant = -determinant
    }
    determinant *= scale
    const pivotRow = augmented[col]
    if (inverse) augmented[col] = pivotRow.map(value => value / scale)
    for (let row = inverse ? 0 : col + 1; row < size; row++) {
      if (row === col) continue
      const multiple = augmented[row][col] / (inverse ? 1 : scale)
      augmented[row][col] = 0
      for (let j = col + 1; j < augmented[row].length; j++) {
        augmented[row][j] -= augmented[col][j] * multiple
      }
      if (inverse) {
        for (let j = 0; j < col; j++) augmented[row][j] -= augmented[col][j] * multiple
      }
    }
  }
  return { determinant, matrix: augmented.map(row => row.slice(size)) }
}
const matrixText = (matrix: number[][]) => matrix.map(row => row.map(value => {
  requireInput(Number.isFinite(value), 'The matrix result is outside the supported range.')
  return String(Number(value.toPrecision(12)))
}).join('  ')).join('\n')

const solidFields = [
  select('shape', 'Solid', 'cuboid', [option('cuboid','Cuboid'), option('cube','Cube'), option('cylinder','Cylinder'), option('sphere','Sphere'), option('cone','Cone')]),
  pos('length', 'Length or side', 5, showFor('shape', 'cuboid', 'cube')),
  pos('width', 'Width', 4, showFor('shape', 'cuboid')),
  pos('height', 'Height', 3, showFor('shape', 'cuboid', 'cylinder', 'cone')),
  pos('radius', 'Radius', 3, showFor('shape', 'cylinder', 'sphere', 'cone')),
] as const
function solid({ shape, length: l, width: w, height: h, radius: r }: { shape: string; length: number; width: number; height: number; radius: number }) {
  const disk = Math.PI * r ** 2
  switch (shape) {
    case 'cube': return { volume: l ** 3, surface: 6 * l ** 2 }
    case 'cylinder': return { volume: disk * h, surface: 2 * Math.PI * r * (r + h) }
    case 'sphere': return { volume: (4 / 3) * disk * r, surface: 4 * disk }
    case 'cone': return { volume: disk * h / 3, surface: Math.PI * r * (r + Math.hypot(r, h)) }
    default: return { volume: l * w * h, surface: 2 * (l * w + w * h + h * l) }
  }
}

const expressionField = (initial: string) => txt('expression', 'Expression', initial, { maxLength: 500, help: 'Type or use the keypad. Press Enter to calculate.' })
const angleField = select('angle', 'Angle unit', 'deg', [option('deg', 'Degrees'), option('rad', 'Radians')])
const category = 'math'

export const mathCalculators = [
  define({ id: 'standard-calculator', category, title: 'Standard Calculator', description: 'Do quick arithmetic with a keyboard-friendly calculator.', keywords: ['basic', 'add subtract multiply divide', 'arithmetic'], keypad: 'standard',
    fields: [expressionField('(18 + 6) × 2')], formula: 'Parentheses take precedence, then multiplication and division, then addition and subtraction. A trailing % divides its operand by 100.',
    faq: { question: 'How do I take 10% off a price?', answer: 'Multiply the price by (1 − 10%). For example, 200 × (1 − 10%) gives 180.' },
    calculate: ({ expression }) => result(line('Answer', evaluateExpression(expression, false))) }),
  define({ id: 'scientific-calculator', category, title: 'Scientific Calculator', description: 'Evaluate powers, roots, trigonometry and logarithms in one expression.', keywords: ['scientific notation', 'sin cos tan', 'algebra', 'factorial'], keypad: 'scientific',
    fields: [expressionField('sqrt(144) + sin(30)'), angleField], formula: 'Use ^ for powers, ! for factorial, ln() for natural log and log() for base 10. Trigonometric functions use the selected angle unit.',
    faq: { question: 'Can I calculate from the keyboard?', answer: 'Yes. Type an expression, press Enter to evaluate, or press Escape while the expression is focused to clear it.' },
    calculate: ({ expression, angle }) => result(line('Answer', evaluateExpression(expression, true, angle === 'deg'))) }),
  define({ id: 'percentage-calculator', category, title: 'Percentage Calculator', description: 'Find a percent of a number, a share of a total, or the effect of a percentage change.', keywords: ['percent of', 'increase', 'decrease'],
    fields: [select('mode', 'Calculation', 'of', [option('of', 'Find X% of Y'), option('share', 'Find X as a percent of Y'), option('add', 'Increase Y by X%'), option('subtract', 'Decrease Y by X%')]), num('x', 'X', 15), num('y', 'Y', 240)],
    formula: 'Percent of = Y × X ÷ 100. Share = X ÷ Y × 100. Increase or decrease = Y × (1 ± X ÷ 100).',
    calculate: ({ mode, x, y }) => {
      if (mode === 'share') {
        requireInput(y !== 0, 'The total Y must be nonzero.', 'y')
        return result(percent('Share of total', x / y * 100))
      }
      const multiplier = { of: x / 100, add: 1 + x / 100, subtract: 1 - x / 100 }
      return result(line('Result', y * multiplier[mode as keyof typeof multiplier]))
    } }),
  define({ id: 'percentage-change-calculator', category, title: 'Percentage Change Calculator', description: 'Compare an original and new value to calculate the size and direction of change.', keywords: ['percent difference', 'growth', 'increase decrease'],
    fields: [num('previous', 'Original value', 80), num('next', 'New value', 100)], formula: 'Change % = (new − original) ÷ |original| × 100.',
    faq: { question: 'Why use the absolute starting value?', answer: 'It keeps the sign of the result aligned with the direction of change for negative starting values.' },
    calculate: ({ previous, next }) => result(percent('Percentage change', changePercent(previous, next)), line('Difference', next - previous)) }),
  define({ id: 'fraction-calculator', category, title: 'Fraction Calculator', description: 'Add, subtract, multiply or divide fractions and reduce the result.', keywords: ['rational numbers', 'simplify'],
    fields: [txt('a', 'First fraction', '1/2'), select('op', 'Operation', '+', ['+', '−', '×', '÷']), txt('b', 'Second fraction', '1/3')],
    formula: 'Use a common denominator for addition and subtraction. Multiply numerators and denominators for products. Divide by multiplying by the reciprocal. Reduce using the GCD.',
    calculate: ({ a, b, op }) => {
      const [an, ad] = readFraction(a, 'a')
      const [bn, bd] = readFraction(b, 'b')
      const common = ad * bd
      requireInput(op !== '÷' || bn !== 0n, 'Cannot divide by a zero fraction.', 'b')
      let [n, d] = op === '+' ? [an * bd + bn * ad, common] : op === '−' ? [an * bd - bn * ad, common]
        : op === '×' ? [an * bn, common] : [an * bd, ad * bn]
      const divisor = d < 0n ? -gcd(n, d) : gcd(n, d)
      n /= divisor
      d /= divisor
      return result(line('Simplified fraction', d === 1n ? String(n) : `${n}/${d}`), line('Decimal approximation', Number(n) / Number(d)))
    } }),
  ...(['lcm', 'gcd'] as const).map(mode => define({
    id: mode === 'lcm' ? 'lcm-calculator' : 'hcf-gcd-calculator', category, title: mode === 'lcm' ? 'LCM Calculator' : 'HCF / GCD Calculator',
    description: mode === 'lcm' ? 'Find the least common multiple of a list of integers.' : 'Find the highest common factor of a list of integers.',
    keywords: mode === 'lcm' ? ['least common multiple', 'lowest common denominator'] : ['greatest common divisor', 'highest common factor'],
    fields: [txt('numbers', 'Integers', '12, 18, 24', { maxLength: 1900, help: 'Separate values with commas or spaces.' })],
    formula: mode === 'lcm' ? 'LCM(a, b) = |a ÷ GCD(a, b) × b|. If either value is zero, the result is zero.' : 'Use the Euclidean algorithm: repeatedly replace (a, b) with (b, a mod b) until b is zero.',
    calculate: ({ numbers }) => {
      const values = integerList(numbers)
      const total = mode === 'gcd' ? values.reduce(gcd) : values.reduce((a, b) => a === 0n || b === 0n ? 0n : a / gcd(a, b) * b)
      return result(line(mode === 'lcm' ? 'Least common multiple' : 'Greatest common divisor', String(total < 0n ? -total : total)))
    },
  })),
  define({ id: 'prime-number-checker', category, title: 'Prime Number Checker', description: 'Check whether an integer has exactly two positive divisors.', keywords: ['is prime', 'composite'],
    fields: [whole('n', 'Integer', 97, -1e12, 1e12)], formula: 'A prime integer is greater than 1 and has no divisor from 2 through its square root.',
    calculate: ({ n }) => result(line('Classification', n < 2 ? 'Neither prime nor composite' : factorize(n).length === 1 ? 'Prime' : 'Composite')) }),
  define({ id: 'prime-factorization', category, title: 'Prime Factorization', description: 'Write a positive integer as the product of its prime factors.', keywords: ['prime factor', 'factor tree'],
    fields: [whole('n', 'Integer', 360, 2, 1e12)], formula: 'Repeatedly divide by the smallest prime divisor. Continue until the remaining factor is 1.',
    calculate: ({ n }) => {
      const counts = new Map<number, number>()
      for (const factor of factorize(n)) counts.set(factor, (counts.get(factor) ?? 0) + 1)
      return result(line('Prime factors', [...counts].map(([factor, exponent]) => exponent === 1 ? String(factor) : `${factor}^${exponent}`).join(' × ')))
    } }),
  define({ id: 'square-and-cube-calculator', category, title: 'Square and Cube Calculator', description: 'Raise a real number to the second and third powers.', keywords: ['power', 'exponent', 'x squared'],
    fields: [num('n', 'Number', 7)], formula: 'Square = x². Cube = x³.',
    calculate: ({ n }) => {
      const square = n ** 2
      const cube = n ** 3
      requireInput(n === 0 || cube !== 0, 'The cube is too small to represent.')
      return result(line('Square', square), line('Cube', cube))
    } }),
  define({ id: 'square-root-and-cube-root', category, title: 'Square Root and Cube Root', description: 'Find the real roots of a positive, negative or zero value.', keywords: ['radical', 'sqrt', 'cbrt'],
    fields: [num('n', 'Number', 64)], formula: 'The square root is the nonnegative y with y² = x. The cube root is the real y with y³ = x.',
    calculate: ({ n }) => n < 0 ? result(line('Cube root', Math.cbrt(n)), line('Square root', 'No real square root'))
      : result(line('Square root', Math.sqrt(n)), line('Cube root', Math.cbrt(n))) }),
  define({ id: 'logarithm-calculator', category, title: 'Logarithm Calculator', description: 'Evaluate a logarithm in any valid base and see its natural and base-10 equivalents.', keywords: ['log', 'ln', 'log base'],
    fields: [pos('n', 'Value', 1000), pos('base', 'Base', 10)], formula: 'logₐ(x) = ln(x) ÷ ln(a). The base is positive and cannot equal 1.',
    calculate: ({ n, base }) => {
      requireInput(base !== 1, 'Choose a base other than 1.', 'base')
      return result(line('Logarithm', Math.log(n) / Math.log(base)), line('Natural logarithm', Math.log(n)), line('Base-10 logarithm', Math.log10(n)))
    } }),
  define({ id: 'equation-solver', category, title: 'Equation Solver', description: 'Find real or complex roots of linear and quadratic equations.', keywords: ['quadratic formula', 'solve for x', 'polynomial'],
    fields: [num('a', 'Coefficient a', 1), num('b', 'Coefficient b', -5), num('c', 'Constant c', 6)],
    formula: 'For ax² + bx + c = 0, use the discriminant b² − 4ac. The linear case a = 0 gives x = −c/b when b is nonzero.',
    calculate: ({ a, b, c }) => {
      if (a === 0) return result(line('Solution', b !== 0 ? -c / b : c === 0 ? 'Every real number' : 'No solution'))
      const scale = Math.max(Math.abs(a), Math.abs(b), Math.abs(c))
      a /= scale
      b /= scale
      c /= scale
      requireInput(a !== 0, 'The coefficient magnitudes differ too much to represent this equation.')
      if (c === 0 && b !== 0) return result(line('Root 1', -b / a), line('Root 2', 0))
      const discriminant = b * b - 4 * a * c
      if (discriminant < 0) {
        const real = -b / (2 * a)
        const imaginary = Math.sqrt(-discriminant) / (2 * Math.abs(a))
        requireInput(Number.isFinite(real) && Number.isFinite(imaginary), 'The roots are outside the supported numeric range.')
        return result(line('Complex roots', `${Number(real.toPrecision(12))} ± ${Number(imaginary.toPrecision(12))}i`))
      }
      if (discriminant === 0) return result(line('Repeated root', -b / (2 * a)))
      const q = -0.5 * (b + (b >= 0 ? 1 : -1) * Math.sqrt(discriminant))
      return result(line('Root 1', q / a), line('Root 2', c / q))
    } }),
  define({ id: 'pythagorean-theorem', category, title: 'Pythagorean Theorem', description: 'Solve for a missing side of a right triangle.', keywords: ['hypotenuse', 'right angle', 'a squared b squared'],
    fields: [select('mode', 'Missing side', 'hypotenuse', [option('hypotenuse','Hypotenuse'), option('leg','Leg')]), pos('a', 'Known leg', 3),
      pos('b', 'Other leg', 4, showFor('mode', 'hypotenuse')), pos('c', 'Hypotenuse', 5, showFor('mode', 'leg'))],
    formula: 'a² + b² = c². The hypotenuse c must be longer than either leg.',
    calculate: ({ mode, a, b, c }) => {
      if (mode === 'hypotenuse') return result(line('Hypotenuse', Math.hypot(a, b)))
      requireInput(c > a, 'The hypotenuse must be longer than the known leg.', 'c')
      return result(line('Missing leg', Math.sqrt(c - a) * Math.sqrt(c) * Math.sqrt(1 + a / c)))
    } }),
  define({ id: 'circle-calculator', category, title: 'Circle Calculator', description: 'Find the area, circumference and diameter of a circle.', keywords: ['radius', 'pi', 'round'],
    fields: [pos('radius', 'Radius', 5)], formula: 'Area = πr². Circumference = 2πr. Diameter = 2r.',
    calculate: ({ radius }) => result(line('Area', Math.PI * radius ** 2, 'square units'), line('Circumference', 2 * Math.PI * radius), line('Diameter', 2 * radius)) }),
  define({ id: 'triangle-calculator', category, title: 'Triangle Calculator', description: 'Calculate the area, perimeter and angles of a triangle from its three sides.', keywords: ['heron formula', 'SSS', 'angle'],
    fields: sides, formula: 'Heron’s formula gives √[s(s − a)(s − b)(s − c)] with s = (a + b + c)/2. Angles follow from the law of cosines.',
    calculate: ({ a, b, c }) => {
      const { area, perimeter } = triangle(a, b, c)
      const scale = Math.max(a, b, c)
      const angle = (opposite: number, x: number, y: number) => {
        const [o, m, n] = [opposite / scale, x / scale, y / scale]
        return Math.acos(Math.min(1, Math.max(-1, (m * m + n * n - o * o) / (2 * m * n)))) * 180 / Math.PI
      }
      return result(line('Area', area, 'square units'), line('Perimeter', perimeter), line('Angle opposite a', angle(a, b, c), '°'), line('Angle opposite b', angle(b, a, c), '°'), line('Angle opposite c', angle(c, a, b), '°'))
    } }),
  define({ id: 'rectangle-and-square-calculator', category, title: 'Rectangle and Square Calculator', description: 'Find the area, perimeter and diagonal of a rectangle or square.', keywords: ['length width', 'diagonal', 'quadrilateral'],
    fields: [select('shape', 'Shape', 'rectangle', [option('rectangle','Rectangle'), option('square','Square')]), pos('length', 'Length or side', 8), pos('width', 'Width', 5, showFor('shape', 'rectangle'))],
    formula: 'Area = length × width. Perimeter = 2(length + width). Diagonal = √(length² + width²). A square has equal sides.',
    calculate: ({ shape, length, width }) => {
      const w = shape === 'square' ? length : width
      return result(line('Area', length * w, 'square units'), line('Perimeter', 2 * (length + w)), line('Diagonal', Math.hypot(length, w)))
    } }),
  define({ id: 'area-and-perimeter-calculator', category, title: 'Area and Perimeter Calculator', description: 'Measure the surface and boundary of common two-dimensional shapes.', keywords: ['polygon', 'parallelogram', 'geometry'],
    fields: [select('shape', 'Shape', 'rectangle', [option('rectangle','Rectangle'), option('square','Square'), option('circle','Circle'), option('triangle','Triangle'), option('parallelogram','Parallelogram')]),
      pos('a', 'Length, side a, base or radius', 6),
      pos('b', 'Width or side b', 5, showFor('shape', 'rectangle', 'triangle', 'parallelogram')),
      pos('c', 'Side c', 5, showFor('shape', 'triangle')), pos('height', 'Perpendicular height', 4, showFor('shape', 'parallelogram'))],
    formula: 'Area depends on the selected shape. Use length × width for a rectangle, πr² for a circle, Heron’s formula for a triangle, and base × height for a parallelogram.',
    calculate: ({ shape, a, b, c, height }) => {
      const shapes: Record<string, () => { area: number; perimeter: number }> = {
        rectangle: () => ({ area: a * b, perimeter: 2 * (a + b) }),
        square: () => ({ area: a * a, perimeter: 4 * a }),
        circle: () => ({ area: Math.PI * a ** 2, perimeter: 2 * Math.PI * a }),
        triangle: () => triangle(a, b, c),
        parallelogram: () => {
          requireInput(height <= b, 'The perpendicular height cannot exceed the sloped side.', 'height')
          return { area: a * height, perimeter: 2 * (a + b) }
        },
      }
      const { area, perimeter } = shapes[shape]()
      return result(line('Area', area, 'square units'), line('Perimeter', perimeter))
    } }),
  define({ id: 'volume-calculator', category, title: 'Volume Calculator', description: 'Calculate the capacity of a cube, cuboid, cylinder, sphere or cone.', keywords: ['cubic', 'geometry', '3D solid'],
    fields: solidFields, formula: 'Cuboid: lwh. Cube: a³. Cylinder: πr²h. Sphere: 4πr³/3. Cone: πr²h/3.',
    calculate: inputs => result(line('Volume', solid(inputs).volume, 'cubic units')) }),
  define({ id: 'surface-area-calculator', category, title: 'Surface Area Calculator', description: 'Calculate the total exterior area of a common three-dimensional solid.', keywords: ['3D solid', 'sphere cylinder cone'],
    fields: solidFields, formula: 'Cuboid: 2(lw + wh + hl). Cube: 6a². Cylinder: 2πr(r + h). Sphere: 4πr². Cone: πr(r + √(r² + h²)). Closed solids include their bases.',
    calculate: inputs => result(line('Total surface area', solid(inputs).surface, 'square units')) }),
  define({ id: 'matrix-calculator', category, title: 'Matrix Calculator', description: 'Add, subtract, multiply, transpose or invert matrices, and calculate determinants.', keywords: ['linear algebra', 'inverse determinant', 'matrix multiplication'],
    fields: [select('op', 'Operation', 'multiply', [option('add','A + B'), option('subtract','A − B'), option('multiply','A × B'), option('transpose','Transpose A'), option('determinant','Determinant of A'), option('inverse','Inverse of A')]),
      txt('a', 'Matrix A', '1 2\n3 4', { kind: 'textarea', maxLength: 1600, help: 'Use spaces between values and one row per line.' }),
      txt('b', 'Matrix B', '5 6\n7 8', { kind: 'textarea', maxLength: 1600, only: showFor('op', 'add','subtract','multiply') })],
    formula: 'Matrix products use row–column dot products. Determinants and inverses use Gaussian elimination with partial pivoting. Results use floating-point arithmetic.',
    calculate: ({ a, b, op }) => {
      const first = readMatrix(a, 'a')
      if (op === 'transpose') return result(line('Transposed matrix', matrixText(first[0].map((_, col) => first.map(row => row[col])))))
      if (op === 'determinant') return result(line('Determinant', eliminate(first, false).determinant))
      if (op === 'inverse') return result(line('Inverse matrix', matrixText(eliminate(first, true).matrix)))
      const second = readMatrix(b, 'b')
      if (op === 'multiply') {
        requireInput(first[0].length === second.length, 'Columns in A must equal rows in B.', 'b')
        return result(line('Product matrix', matrixText(first.map(row => second[0].map((_, j) => row.reduce((sum, value, k) => sum + value * second[k][j], 0))))))
      }
      requireInput(first.length === second.length && first[0].length === second[0].length, 'Use matrices with matching dimensions.', 'b')
      return result(line('Result matrix', matrixText(first.map((row, i) => row.map((value, j) => value + (op === 'add' ? 1 : -1) * second[i][j])))))
    } }),
]
