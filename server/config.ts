import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env.local (for local development)
// In production, environment variables should be set by the deployment platform
if (process.env.NODE_ENV !== 'production') {
  // Try to load .env.local first, then .env as fallback
  config({ path: path.resolve(process.cwd(), '.env.local') });
  config({ path: path.resolve(process.cwd(), '.env') });
}

export const ENV = {
  DATABASE_URL: process.env.DATABASE_URL!,
  SESSION_SECRET: process.env.SESSION_SECRET!,
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  IS_REPLIT: process.env.REPL_ID !== undefined,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
};

// Validation with helpful error messages
if (!ENV.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL must be set. Please check your .env.local file or environment variables.'
  );
}

if (!ENV.SESSION_SECRET) {
  throw new Error(
    'SESSION_SECRET must be set. Please add a secure random string to your .env.local file.'
  );
}

if (ENV.SESSION_SECRET.length < 32) {
  console.warn('⚠️  SESSION_SECRET should be at least 32 characters for security');
}

// Log configuration (without sensitive data)
console.log('🔧 Environment Configuration:');
console.log(`   NODE_ENV: ${ENV.NODE_ENV}`);
console.log(`   PORT: ${ENV.PORT}`);
console.log(`   DATABASE: ${ENV.DATABASE_URL ? '✅ Connected' : '❌ Missing'}`);
console.log(`   SESSION_SECRET: ${ENV.SESSION_SECRET ? '✅ Set' : '❌ Missing'}`);
console.log(`   IS_REPLIT: ${ENV.IS_REPLIT ? '✅ Yes' : 'No'}`);