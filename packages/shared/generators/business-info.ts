/**
 * Business info test data generator
 */

import {
  COMPANY_NAMES,
  COMPANY_SUFFIXES,
  BUSINESS_TYPES,
  BUSINESS_CATEGORIES,
  STREETS,
  CITIES,
  STATES,
} from './names.js';
import { pick, pickIndex, randomInt, randomDigits } from './random.js';
import type { BusinessInfo } from './types.js';

export function generateBusinessInfo(): BusinessInfo {
  const companyName = pick(COMPANY_NAMES);
  const suffix = pick(COMPANY_SUFFIXES);
  const businessType = pick(BUSINESS_TYPES);
  const streetName = pick(STREETS);
  const cityIndex = pickIndex(CITIES);
  const city = CITIES[cityIndex];
  const state = STATES[cityIndex];

  return {
    legalName: `${companyName} ${suffix}`,
    tradingName: `${companyName} ${businessType}`,
    registrationNumber: randomDigits(9),
    taxId: `${randomInt(10, 99)}-${randomDigits(7)}`,
    category: pick(BUSINESS_CATEGORIES),
    subcategory: businessType,
    yearEstablished: randomInt(2004, new Date().getFullYear()),
    monthlyVolume: randomInt(10000, 100000),
    website: `https://www.${companyName.toLowerCase()}-${businessType.toLowerCase().replace(/\s+/g, '')}.com`,
    description: `Leading provider of ${businessType.toLowerCase()} products and services. We specialize in innovative solutions for modern businesses with a focus on quality and customer satisfaction.`,
    businessAddress: {
      street: `${randomInt(1000, 9999)} ${streetName} Street`,
      city: city,
      state: state,
      postalCode: randomDigits(5),
      country: 'US',
    },
  };
}
