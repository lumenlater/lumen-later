/**
 * Utility for parsing ScVal from base64 encoded XDR
 */

import { xdr, scValToNative } from '@stellar/stellar-sdk';

/**
 * Parse a base64 encoded ScVal string
 * @param base64Value - Base64 encoded XDR string
 * @returns Parsed native JavaScript value
 */
export function parseScVal(base64Value: string): any {
  try {
    const scVal = xdr.ScVal.fromXDR(base64Value, 'base64');
    return scValToNative(scVal);
  } catch (error) {
    console.error('Error parsing ScVal:', error);
    throw error;
  }
}

/**
 * Parse a map ScVal and convert to JavaScript object
 * @param mapValue - Parsed ScVal map
 * @returns JavaScript object with key-value pairs
 */
export function parseScValMap(mapValue: any): Record<string, any> {
  if (!mapValue || typeof mapValue !== 'object') {
    return {};
  }

  // If it's already a plain object, return it
  if (!Array.isArray(mapValue)) {
    return mapValue;
  }

  // If it's an array of key-value pairs (from map)
  const result: Record<string, any> = {};
  for (const item of mapValue) {
    if (item.key && item.val) {
      const key = item.key.symbol || item.key.string || String(item.key);
      result[key] = parseScValValue(item.val);
    }
  }
  
  return result;
}

/**
 * Parse individual ScVal value types
 * @param val - ScVal value object
 * @returns Parsed JavaScript value
 */
function parseScValValue(val: any): any {
  if (val.i128) {
    return BigInt(val.i128);
  }
  if (val.u64) {
    return BigInt(val.u64);
  }
  if (val.u32) {
    return val.u32;
  }
  if (val.i32) {
    return val.i32;
  }
  if (val.symbol) {
    return val.symbol;
  }
  if (val.string) {
    return val.string;
  }
  if (val.address) {
    return val.address;
  }
  if (val.bool !== undefined) {
    return val.bool;
  }
  
  // For complex types, return as is
  return val;
}