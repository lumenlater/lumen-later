/**
 * Contact info test data generator
 */

import {
  FIRST_NAMES,
  LAST_NAMES,
  JOB_TITLES,
  TECHNICAL_TITLES,
  FINANCIAL_TITLES,
  EMAIL_DOMAINS,
} from './names.js';
import { pick, randomInt } from './random.js';
import type { ContactPerson, ContactInfo } from './types.js';

export function generateContactPerson(type: 'primary' | 'technical' | 'financial' = 'primary'): ContactPerson {
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const domain = pick(EMAIL_DOMAINS);

  let title: string;
  switch (type) {
    case 'technical':
      title = pick(TECHNICAL_TITLES);
      break;
    case 'financial':
      title = pick(FINANCIAL_TITLES);
      break;
    default:
      title = pick(JOB_TITLES);
  }

  return {
    firstName,
    lastName,
    title,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
    phone: `+1 ${randomInt(100, 999)} ${randomInt(100, 999)} ${randomInt(1000, 9999)}`,
  };
}

export function generateContactInfo(includeOptional = true): ContactInfo {
  const result: ContactInfo = {
    primaryContact: generateContactPerson('primary'),
  };

  if (includeOptional) {
    result.technicalContact = generateContactPerson('technical');
    result.financialContact = generateContactPerson('financial');
  }

  return result;
}
