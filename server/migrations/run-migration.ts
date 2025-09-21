#!/usr/bin/env tsx

// Migration script to run database migrations safely
import { readFileSync } from 'fs';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function runMigration() {
  console.log('🚀 Starting database migration...');

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Hash the admin password
    console.log('🔐 Hashing admin password...');
    const hashedPassword = await hashPassword('qwer!234');

    // Read the SQL migration file
    console.log('📖 Reading migration file...');
    let migrationSql = readFileSync('./migrations/001_add_users_table.sql', 'utf8');

    // Replace placeholder with actual hashed password
    migrationSql = migrationSql.replace('$placeholder_for_hashed_password$', hashedPassword);

    // Execute migration
    console.log('⚡ Executing migration...');
    await pool.query(migrationSql);

    // Verify the migration
    console.log('✅ Verifying migration...');
    const result = await pool.query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.clinic_id, c.name as clinic_name
      FROM users u
      JOIN clinics c ON u.clinic_id = c.id
      WHERE u.email = 'abror_iskandarov@yahoo.com'
    `);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('🎉 Migration successful!');
      console.log(`👤 Admin user created:
        - Email: ${user.email}
        - Name: ${user.first_name} ${user.last_name}
        - Role: ${user.role}
        - Clinic ID: ${user.clinic_id}
        - Clinic Name: ${user.clinic_name}
      `);
    } else {
      console.error('❌ Migration verification failed - admin user not found');
    }

    // Check table structure
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    console.log('📋 Users table structure:');
    tableInfo.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(required)' : '(optional)'}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});