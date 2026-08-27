import type { JourneyContext } from './journey-template.js';

export type ExpressionValue = string | number | boolean | null;
export type ApplicabilityExpression =
  | { eq: [path: string, value: ExpressionValue] }
  | { in: [path: string, values: ExpressionValue[]] }
  | { exists: string }
  | { and: ApplicabilityExpression[] }
  | { or: ApplicabilityExpression[] };

const ALLOWED_PATHS = new Set([
  'residenceContext',
  'visaRouteVersionId',
  'caseType',
  'sectorVersionId',
  'occupationVersionId',
]);
const MAX_DEPTH = 12;

export class ApplicabilityExpressionError extends Error {
  readonly code = 'INVALID_APPLICABILITY_EXPRESSION';
  constructor(message: string) {
    super(`EXPRESSION_${message}`);
    this.name = 'ApplicabilityExpressionError';
  }
}

function isValue(value: unknown): value is ExpressionValue {
  return value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function assertPath(path: unknown): asserts path is string {
  if (typeof path !== 'string' || !ALLOWED_PATHS.has(path)) throw new ApplicabilityExpressionError('PATH_NOT_ALLOWED');
}

export function validateApplicabilityExpression(expression: unknown, depth = 0): asserts expression is ApplicabilityExpression {
  if (depth > MAX_DEPTH || !expression || typeof expression !== 'object' || Array.isArray(expression)) {
    throw new ApplicabilityExpressionError('SHAPE_INVALID');
  }
  const keys = Object.keys(expression);
  if (keys.length !== 1) throw new ApplicabilityExpressionError('OPERATOR_INVALID');
  const value = expression as Record<string, unknown>;
  const operator = keys[0];
  if (operator === 'eq') {
    if (!Array.isArray(value.eq) || value.eq.length !== 2) throw new ApplicabilityExpressionError('EQ_INVALID');
    assertPath(value.eq[0]);
    if (!isValue(value.eq[1])) throw new ApplicabilityExpressionError('VALUE_INVALID');
    if (typeof value.eq[1] === 'string' && /^https?:\/\//i.test(value.eq[1])) throw new ApplicabilityExpressionError('REMOTE_VALUE_FORBIDDEN');
    return;
  }
  if (operator === 'in') {
    if (!Array.isArray(value.in) || value.in.length !== 2 || !Array.isArray(value.in[1]) || value.in[1].length === 0) {
      throw new ApplicabilityExpressionError('IN_INVALID');
    }
    assertPath(value.in[0]);
    if (!value.in[1].every(isValue)) throw new ApplicabilityExpressionError('VALUE_INVALID');
    return;
  }
  if (operator === 'exists') {
    assertPath(value.exists);
    return;
  }
  if (operator === 'and' || operator === 'or') {
    const children = value[operator];
    if (!Array.isArray(children) || children.length === 0) throw new ApplicabilityExpressionError(`${operator.toUpperCase()}_INVALID`);
    for (const child of children) validateApplicabilityExpression(child, depth + 1);
    return;
  }
  throw new ApplicabilityExpressionError('OPERATOR_INVALID');
}

function contextValue(context: JourneyContext, path: string): ExpressionValue | undefined {
  return context[path as keyof JourneyContext] as ExpressionValue | undefined;
}

export function evaluateApplicability(expression: ApplicabilityExpression, context: JourneyContext): boolean {
  validateApplicabilityExpression(expression);
  if ('eq' in expression) return contextValue(context, expression.eq[0]) === expression.eq[1];
  if ('in' in expression) return expression.in[1].some((candidate) => contextValue(context, expression.in[0]) === candidate);
  if ('exists' in expression) {
    const value = contextValue(context, expression.exists);
    return value !== undefined && value !== null && value !== '';
  }
  if ('and' in expression) return expression.and.every((child) => evaluateApplicability(child, context));
  return expression.or.some((child) => evaluateApplicability(child, context));
}

