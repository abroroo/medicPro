import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";
import 'dotenv/config';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function completeMigration() {
  try {
    console.log("Starting complete doctors → users migration...");

    // Step 1: Add new columns to users table if they don't exist
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS specialization TEXT,
      ADD COLUMN IF NOT EXISTS cabinet_number TEXT,
      ADD COLUMN IF NOT EXISTS phone TEXT;
    `);
    console.log("✓ Added doctor fields to users table");

    // Step 2: First drop old foreign key constraints to avoid conflicts
    console.log("Dropping old foreign key constraints...");

    try {
      await pool.query(`ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_doctor_id_doctors_id_fk;`);
      console.log("✓ Dropped visits_doctor_id_doctors_id_fk");
    } catch (error) {
      console.log("ℹ visits_doctor_id_doctors_id_fk constraint not found");
    }

    try {
      await pool.query(`ALTER TABLE clinical_notes DROP CONSTRAINT IF EXISTS clinical_notes_doctor_id_doctors_id_fk;`);
      console.log("✓ Dropped clinical_notes_doctor_id_doctors_id_fk");
    } catch (error) {
      console.log("ℹ clinical_notes_doctor_id_doctors_id_fk constraint not found");
    }

    try {
      await pool.query(`ALTER TABLE queue DROP CONSTRAINT IF EXISTS queue_doctor_id_doctors_id_fk;`);
      console.log("✓ Dropped queue_doctor_id_doctors_id_fk");
    } catch (error) {
      console.log("ℹ queue_doctor_id_doctors_id_fk constraint not found");
    }

    // Step 3: Migrate existing doctors to users table
    const doctorsResult = await pool.query(`
      SELECT id, clinic_id, name, specialization, cabinet_number, phone, email, is_active, created_at
      FROM doctors
      WHERE id NOT IN (
        SELECT id FROM users WHERE role IN ('doctor', 'head_doctor')
      )
    `);

    console.log(`Found ${doctorsResult.rowCount} new doctors to migrate`);

    // Create a mapping of old doctor IDs to new user IDs
    const doctorUserMapping = new Map();

    for (const doctor of doctorsResult.rows) {
      // Split doctor name into first and last name
      const nameParts = doctor.name.trim().split(' ');
      const firstName = nameParts[0] || 'Doctor';
      const lastName = nameParts.slice(1).join(' ') || 'Unknown';

      // Create a user for each doctor
      const userResult = await pool.query(`
        INSERT INTO users (
          email, password, first_name, last_name, clinic_id, role,
          specialization, cabinet_number, phone, is_active, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `, [
        doctor.email || `doctor${doctor.id}@clinic.com`, // Use existing email or generate one
        '$2b$10$defaulthashedpassword', // Default password hash (users will need to reset)
        firstName,
        lastName,
        doctor.clinic_id,
        'doctor', // Set role as doctor
        doctor.specialization,
        doctor.cabinet_number,
        doctor.phone,
        doctor.is_active,
        doctor.created_at
      ]);

      const newUserId = userResult.rows[0].id;
      doctorUserMapping.set(doctor.id, newUserId);

      console.log(`✓ Migrated doctor ${doctor.id} (${doctor.name}) → user ${newUserId}`);
    }

    // Step 4: Check for orphaned visits, clinical_notes, and queue records
    const orphanedVisits = await pool.query(`
      SELECT DISTINCT doctor_id FROM visits
      WHERE doctor_id NOT IN (SELECT id FROM users WHERE role IN ('doctor', 'head_doctor'))
      AND doctor_id IS NOT NULL
    `);

    const orphanedNotes = await pool.query(`
      SELECT DISTINCT doctor_id FROM clinical_notes
      WHERE doctor_id NOT IN (SELECT id FROM users WHERE role IN ('doctor', 'head_doctor'))
      AND doctor_id IS NOT NULL
    `);

    const orphanedQueue = await pool.query(`
      SELECT DISTINCT doctor_id FROM queue
      WHERE doctor_id NOT IN (SELECT id FROM users WHERE role IN ('doctor', 'head_doctor'))
      AND doctor_id IS NOT NULL
    `);

    if (orphanedVisits.rowCount > 0) {
      console.log(`⚠️  Found ${orphanedVisits.rowCount} orphaned doctor_id values in visits:`, orphanedVisits.rows.map(r => r.doctor_id));
    }
    if (orphanedNotes.rowCount > 0) {
      console.log(`⚠️  Found ${orphanedNotes.rowCount} orphaned doctor_id values in clinical_notes:`, orphanedNotes.rows.map(r => r.doctor_id));
    }
    if (orphanedQueue.rowCount > 0) {
      console.log(`⚠️  Found ${orphanedQueue.rowCount} orphaned doctor_id values in queue:`, orphanedQueue.rows.map(r => r.doctor_id));
    }

    // Step 5: Update foreign key references using the mapping
    console.log("Updating foreign key references...");

    for (const [oldDoctorId, newUserId] of doctorUserMapping) {
      await pool.query(`
        UPDATE visits SET doctor_id = $1 WHERE doctor_id = $2
      `, [newUserId, oldDoctorId]);

      await pool.query(`
        UPDATE clinical_notes SET doctor_id = $1 WHERE doctor_id = $2
      `, [newUserId, oldDoctorId]);

      await pool.query(`
        UPDATE queue SET doctor_id = $1 WHERE doctor_id = $2
      `, [newUserId, oldDoctorId]);
    }
    console.log("✓ Updated foreign key references");

    // Step 6: Handle any remaining orphaned records by setting doctor_id to NULL
    if (orphanedVisits.rowCount > 0 || orphanedNotes.rowCount > 0 || orphanedQueue.rowCount > 0) {
      console.log("Cleaning up orphaned doctor references by setting them to NULL...");

      await pool.query(`
        UPDATE visits SET doctor_id = NULL
        WHERE doctor_id NOT IN (SELECT id FROM users WHERE role IN ('doctor', 'head_doctor'))
        AND doctor_id IS NOT NULL
      `);

      await pool.query(`
        UPDATE clinical_notes SET doctor_id = NULL
        WHERE doctor_id NOT IN (SELECT id FROM users WHERE role IN ('doctor', 'head_doctor'))
        AND doctor_id IS NOT NULL
      `);

      await pool.query(`
        UPDATE queue SET doctor_id = NULL
        WHERE doctor_id NOT IN (SELECT id FROM users WHERE role IN ('doctor', 'head_doctor'))
        AND doctor_id IS NOT NULL
      `);
      console.log("✓ Cleaned up orphaned doctor references");
    }

    // Step 7: Now add the new foreign key constraints
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

    // Step 8: Verify migration
    const userCount = await pool.query(`
      SELECT COUNT(*) FROM users WHERE role IN ('doctor', 'head_doctor')
    `);

    const visitCount = await pool.query(`
      SELECT COUNT(*) FROM visits v
      JOIN users u ON v.doctor_id = u.id
      WHERE u.role IN ('doctor', 'head_doctor')
    `);

    console.log("✅ Migration completed successfully!");
    console.log(`- Created ${doctorUserMapping.size} doctor users`);
    console.log(`- Total doctor users in system: ${userCount.rows[0].count}`);
    console.log(`- Visits linked to doctor users: ${visitCount.rows[0].count}`);
    console.log("- Doctor-user ID mapping:", Object.fromEntries(doctorUserMapping));

    // Optional: Show current doctors table status
    try {
      const remainingDoctors = await pool.query(`SELECT COUNT(*) FROM doctors`);
      console.log(`- Doctors table still has ${remainingDoctors.rows[0].count} records (for safety)`);
    } catch (error) {
      console.log("- Doctors table may have been dropped or doesn't exist");
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

completeMigration();