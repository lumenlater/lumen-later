/**
 * Name dictionaries for test data generation
 */

export const COMPANY_NAMES = [
  'Stellar', 'Nova', 'Quantum', 'Phoenix', 'Apex', 'Zenith', 'Cosmos', 'Nexus',
  'Aurora', 'Vertex', 'Helix', 'Prism', 'Cipher', 'Vortex', 'Pulse', 'Echo'
];

export const COMPANY_SUFFIXES = [
  'Corp', 'Inc', 'LLC', 'Holdings', 'Enterprises', 'Solutions', 'Group', 'Technologies'
];

export const BUSINESS_TYPES = [
  'Electronics', 'Fashion', 'Services', 'Technology', 'Healthcare',
  'Restaurant', 'Retail', 'E-commerce', 'Consulting', 'Manufacturing'
];

export const FIRST_NAMES = [
  'John', 'Sarah', 'Michael', 'Jennifer', 'Robert', 'Lisa', 'David', 'Maria',
  'James', 'Emily', 'William', 'Emma', 'Richard', 'Olivia', 'Joseph', 'Ava'
];

export const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'White', 'Harris'
];

export const JOB_TITLES = [
  'CEO', 'CTO', 'CFO', 'COO', 'President', 'Vice President', 'Director', 'Manager'
];

export const TECHNICAL_TITLES = [
  'CTO', 'Technical Director', 'IT Manager', 'Engineering Manager', 'Lead Developer'
];

export const FINANCIAL_TITLES = [
  'CFO', 'Finance Director', 'Controller', 'Accounting Manager', 'Treasurer'
];

export const STREETS = [
  'Main', 'Oak', 'Maple', 'Cedar', 'Elm', 'Pine', 'Washington', 'Broadway',
  'Park', 'Lake', 'Hill', 'River', 'Forest', 'Sunset', 'Highland', 'Valley'
];

export const CITIES = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
  'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'Austin'
];

export const STATES = [
  'NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'TX', 'CA', 'TX', 'TX'
];

export const EMAIL_DOMAINS = [
  'gmail.com', 'company.com', 'business.com', 'corp.com', 'enterprise.com'
];

export const BANK_NAMES = [
  'Chase Bank', 'Bank of America', 'Wells Fargo', 'Citibank',
  'US Bank', 'PNC Bank', 'Capital One', 'TD Bank'
];

export const SWIFT_CODES = [
  'CHASUS33', 'BOFAUS3N', 'WFBIUS6S', 'CITIUS33',
  'USBKUS44', 'PNCCUS33', 'NFBKUS33', 'TDOMCATT'
];

export const BUSINESS_CATEGORIES = [
  'retail', 'restaurant', 'services', 'healthcare', 'education',
  'technology', 'automotive', 'home_garden', 'fashion', 'electronics', 'other'
] as const;

export type BusinessCategory = typeof BUSINESS_CATEGORIES[number];
