#!/usr/bin/env tsx

// Migration script to migrate remaining clinics to users table
import { readFileSync } from 'fs';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

async function runMigration() {
  console.log('🚀 Starting migration 002: Migrating remaining clinics...');

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Read the SQL migration file
    console.log('📖 Reading migration file...');
    const migrationSql = readFileSync('./server/migrations/002_migrate_remaining_clinics.sql', 'utf8');

    // Execute migration
    console.log('⚡ Executing migration...');
    await pool.query(migrationSql);

    // Verify the migration
    console.log('✅ Verifying migration...');
    const result = await pool.query(`
      SELECT
        u.id as user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.clinic_id,
        u.role,
        c.name as clinic_name
      FROM users u
      JOIN clinics c ON u.clinic_id = c.id
      WHERE u.role = 'admin'
      ORDER BY u.clinic_id;
    `);

    if (result.rows.length > 0) {
      console.log('🎉 Migration successful!');
      console.log('👥 Admin users created:');
      result.rows.forEach(user => {
        console.log(`  - ${user.email} (${user.first_name} ${user.last_name}) for clinic "${user.clinic_name}" (ID: ${user.clinic_id})`);
      });
    } else {
      console.log('⚠️  No admin users found after migration');
    }

    // Show total user count
    const totalUsers = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`📊 Total users in system: ${totalUsers.rows[0].count}`);

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