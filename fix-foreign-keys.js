import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";
import 'dotenv/config';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fixForeignKeys() {
  try {
    console.log("Starting foreign key constraint updates...");

    // Step 1: First add the new columns to users table if they don't exist
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS specialization TEXT,
      ADD COLUMN IF NOT EXISTS cabinet_number TEXT,
      ADD COLUMN IF NOT EXISTS phone TEXT;
    `);
    console.log("✓ Added doctor fields to users table");

    // Step 2: Drop the existing foreign key constraints that point to doctors table
    console.log("Dropping old foreign key constraints...");

    try {
      await pool.query(`ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_doctor_id_doctors_id_fk;`);
      console.log("✓ Dropped visits_doctor_id_doctors_id_fk");
    } catch (error) {
      console.log("ℹ visits_doctor_id_doctors_id_fk doesn't exist or already dropped");
    }

    try {
      await pool.query(`ALTER TABLE clinical_notes DROP CONSTRAINT IF EXISTS clinical_notes_doctor_id_doctors_id_fk;`);
      console.log("✓ Dropped clinical_notes_doctor_id_doctors_id_fk");
    } catch (error) {
      console.log("ℹ clinical_notes_doctor_id_doctors_id_fk doesn't exist or already dropped");
    }

    try {
      await pool.query(`ALTER TABLE queue DROP CONSTRAINT IF EXISTS queue_doctor_id_doctors_id_fk;`);
      console.log("✓ Dropped queue_doctor_id_doctors_id_fk");
    } catch (error) {
      console.log("ℹ queue_doctor_id_doctors_id_fk doesn't exist or already dropped");
    }

    // Step 3: Add new foreign key constraints that point to users table
    console.log("Adding new foreign key constraints...");

    await pool.query(`
      ALTER TABLE visits
      ADD CONSTRAINT visits_doctor_id_users_id_fk
      FOREIGN KEY (doctor_id) REFERENCES users(id);
    `);
    console.log("✓ Added visits_doctor_id_users_id_fk");

    await pool.query(`
      ALTER TABLE clinical_notes
      ADD CONSTRAINT clinical_notes_doctor_id_users_id_fk
      FOREIGN KEY (doctor_id) REFERENCES users(id);
    `);
    console.log("✓ Added clinical_notes_doctor_id_users_id_fk");

    await pool.query(`
      ALTER TABLE queue
      ADD CONSTRAINT queue_doctor_id_users_id_fk
      FOREIGN KEY (doctor_id) REFERENCES users(id);
    `);
    console.log("✓ Added queue_doctor_id_users_id_fk");

    console.log("✅ Foreign key constraints updated successfully!");

  } catch (error) {
    console.error('❌ Foreign key update failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixForeignKeys();