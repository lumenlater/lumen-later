import { LumenLater } from '@lumenlater/merchant-sdk';

export const ll = new LumenLater({
  secretKey: process.env.STELLAR_SECRET_KEY!,
  apiKey: process.env.LUMENLATER_API_KEY!,
  apiBaseUrl: process.env.LUMENLATER_API_URL || 'http://localhost:3000/api',
});
