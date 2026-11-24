import { requireInput } from './core'

const functions: Record<string, (n: number) => number> = {
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, ln: Math.log, log: Math.log10, exp: Math.exp,
}

export function evaluateExpression(input: string, scientific = true, degrees = true): number {
  const normalized = input.replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-').replaceAll('π', 'pi').toLowerCase()
  const tokens = normalized.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[a-z]+|[^\s]/g) ?? []
  requireInput(tokens.length > 0 && tokens.length <= 200, 'Enter an expression with up to 200 tokens.', 'expression')
  let index = 0
  const accept = (token: string) => tokens[index] === token && ++index > 0
  const angle = (value: number) => degrees ? value * (Math.PI / 180) : value

  function atom(): number {
    if (accept('(')) {
      const value = sum()
      requireInput(accept(')'), 'Close the open parenthesis.', 'expression')
      return value
    }
    const token = tokens[index++] ?? ''
    if (/^[\d.]/.test(token)) {
      const value = Number(token)
      requireInput(Number.isFinite(value), 'The number is outside the supported range.', 'expression')
      requireInput(value !== 0 || !/[1-9]/.test(token.split('e')[0]), 'The number is too small to represent.', 'expression')
      return value
    }
    if (scientific && token === 'pi') return Math.PI
    if (scientific && token === 'e') return Math.E
    if (scientific && /^[a-z]/.test(token)) {
      requireInput(accept('('), 'Use parentheses after a function name, for example sin(30).', 'expression')
      const value = sum()
      requireInput(accept(')'), 'Close the function parenthesis.', 'expression')
      if (token === 'sin') return Math.sin(angle(value))
      if (token === 'cos') return Math.cos(angle(value))
      if (token === 'tan') {
        const radians = angle(value)
        requireInput(Math.abs(Math.cos(radians)) > 1e-14, 'Tangent is undefined at this angle.', 'expression')
        return Math.tan(radians)
      }
      if (Object.hasOwn(functions, token)) return functions[token](value)
    }
    throw new Error(`Unexpected ${token ? 'token “' + token + '”' : 'end of expression'}.`)
  }

  function postfix(): number {
    let value = atom()
    while (tokens[index] === '%' || (scientific && tokens[index] === '!')) {
      if (accept('%')) {
        value /= 100
        continue
      }
      index++
      requireInput(Number.isInteger(value) && value >= 0 && value <= 170, 'Factorial needs a whole number from 0 to 170.', 'expression')
      let factorial = 1
      for (let n = 2; n <= value; n++) factorial *= n
      value = factorial
    }
    return value
  }

  function unary(): number {
    if (accept('+')) return unary()
    if (accept('-')) return -unary()
    const base = postfix()
    return scientific && accept('^') ? base ** unary() : base
  }

  function product(): number {
    let value = unary()
    for (;;) {
      if (accept('*')) value *= unary()
      else if (accept('/')) {
        const divisor = unary()
        requireInput(divisor !== 0, 'Division by zero is undefined.', 'expression')
        value /= divisor
      } else if (scientific && /^(?:\(|[a-z])/.test(tokens[index] ?? '')) value *= unary()
      else return value
      requireInput(Number.isFinite(value), 'An intermediate result is undefined or outside the supported range.', 'expression')
    }
  }

  function sum(): number {
    let value = product()
    for (;;) {
      if (accept('+')) value += product()
      else if (accept('-')) value -= product()
      else return value
    }
  }

  const value = sum()
  requireInput(index === tokens.length, `Check the operator before “${tokens[index]}”.`, 'expression')
  requireInput(Number.isFinite(value), 'The expression is undefined or outside the supported range.', 'expression')
  return Number(value.toPrecision(15))
}
