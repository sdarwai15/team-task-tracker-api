import dotenv from 'dotenv';
dotenv.config();

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3000', 10),
  DATABASE_URL: required('DATABASE_URL'),
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
};
