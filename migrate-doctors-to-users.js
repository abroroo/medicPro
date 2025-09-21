import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";
import 'dotenv/config';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrateDoctorsToUsers() {
  try {
    console.log("Starting doctors → users migration...");

    // Step 1: Add new columns to users table
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS specialization TEXT,
      ADD COLUMN IF NOT EXISTS cabinet_number TEXT,
      ADD COLUMN IF NOT EXISTS phone TEXT;
    `);
    console.log("✓ Added doctor fields to users table");

    // Step 2: Migrate existing doctors to users table
    const doctorsResult = await pool.query(`
      SELECT id, clinic_id, name, specialization, cabinet_number, phone, email, is_active, created_at
      FROM doctors
    `);

    console.log(`Found ${doctorsResult.rowCount} doctors to migrate`);

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

    // Step 3: Update foreign key references
    console.log("Updating foreign key references...");

    // Update visits
    for (const [oldDoctorId, newUserId] of doctorUserMapping) {
      await pool.query(`
        UPDATE visits SET doctor_id = $1 WHERE doctor_id = $2
      `, [newUserId, oldDoctorId]);
    }
    console.log("✓ Updated visits.doctor_id references");

    // Update clinical_notes
    for (const [oldDoctorId, newUserId] of doctorUserMapping) {
      await pool.query(`
        UPDATE clinical_notes SET doctor_id = $1 WHERE doctor_id = $2
      `, [newUserId, oldDoctorId]);
    }
    console.log("✓ Updated clinical_notes.doctor_id references");

    // Update queue
    for (const [oldDoctorId, newUserId] of doctorUserMapping) {
      await pool.query(`
        UPDATE queue SET doctor_id = $1 WHERE doctor_id = $2
      `, [newUserId, oldDoctorId]);
    }
    console.log("✓ Updated queue.doctor_id references");

    // Step 4: Drop the doctors table (commented out for safety)
    // Uncomment this line only after verifying the migration worked correctly:
    // await pool.query('DROP TABLE doctors');
    console.log("⚠️  Doctors table preserved for safety - drop manually after verification");

    // Step 5: Verify migration
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

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateDoctorsToUsers();