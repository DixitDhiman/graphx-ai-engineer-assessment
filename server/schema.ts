import Ajv, { ErrorObject } from 'ajv';
import productSchema from '../data/product_schema.json' with { type: 'json' };

const validator = new Ajv({ allErrors: true, strict: false }).compile(productSchema);

export function validateProduct(value: unknown): { valid: boolean; errors: string[] } {
  const valid = validator(value);
  return {
    valid: Boolean(valid),
    errors: valid ? [] : (validator.errors ?? []).map(formatError),
  };
}

function formatError(error: ErrorObject): string {
  const path = error.instancePath || 'product';
  return `${path} ${error.message ?? 'is invalid'}`;
}

export { productSchema };