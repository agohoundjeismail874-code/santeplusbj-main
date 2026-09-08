import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function getSecret(name: string): string {
  const value = process.env[name];

  if (value) {
    return value;
  }

  throw new Error(`${name} must be configured`);
}

export const authConfig = {
  accessSecret: getSecret('JWT_SECRET'),
  refreshSecret: getSecret('JWT_REFRESH_SECRET'),
};
