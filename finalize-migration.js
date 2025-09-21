import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";
import 'dotenv/config';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function finalizeMigration() {
  try {
    console.log("Finalizing migration with foreign key updates...");

    // Step 1: Check current state of doctor users
    const existingDoctorUsers = await pool.query(`
      SELECT id, email, first_name, last_name, specialization FROM users
      WHERE role IN ('doctor', 'head_doctor')
      ORDER BY id
    `);
    console.log(`Found ${existingDoctorUsers.rowCount} existing doctor users:`);
    existingDoctorUsers.rows.forEach(user => {
      console.log(`  - User ${user.id}: ${user.first_name} ${user.last_name} (${user.email})`);
    });

    // Step 2: Check if there are still doctors in the doctors table
    let doctorsToMigrate = [];
    try {
      const remainingDoctors = await pool.query(`
        SELECT id, name, email, specialization FROM doctors
        WHERE email NOT IN (SELECT email FROM users WHERE role IN ('doctor', 'head_doctor'))
        ORDER BY id
      `);

      console.log(`Found ${remainingDoctors.rowCount} doctors still to migrate:`);
      remainingDoctors.rows.forEach(doctor => {
        console.log(`  - Doctor ${doctor.id}: ${doctor.name} (${doctor.email})`);
      });

      doctorsToMigrate = remainingDoctors.rows;
    } catch (error) {
      console.log("No remaining doctors to migrate or doctors table doesn't exist");
    }

    // Step 3: Create mapping between doctor IDs and user IDs
    const doctorToUserMapping = new Map();

    // Get existing mappings for already migrated doctors
    const existingMappings = await pool.query(`
      SELECT d.id as doctor_id, u.id as user_id
      FROM doctors d
      JOIN users u ON d.email = u.email
      WHERE u.role IN ('doctor', 'head_doctor')
    `);

    existingMappings.rows.forEach(row => {
      doctorToUserMapping.set(row.doctor_id, row.user_id);
    });

    console.log(`Found ${doctorToUserMapping.size} existing doctor→user mappings`);

    // Step 4: Migrate any remaining doctors
    for (const doctor of doctorsToMigrate) {
      const nameParts = doctor.name.trim().split(' ');
      const firstName = nameParts[0] || 'Doctor';
      const lastName = nameParts.slice(1).join(' ') || 'Unknown';

      try {
        const userResult = await pool.query(`
          INSERT INTO users (
            email, password, first_name, last_name, clinic_id, role,
            specialization, cabinet_number, phone, is_active, created_at
          ) VALUES ($1, $2, $3, $4,
            (SELECT clinic_id FROM doctors WHERE id = $5),
            'doctor',
            (SELECT specialization FROM doctors WHERE id = $5),
            (SELECT cabinet_number FROM doctors WHERE id = $5),
            (SELECT phone FROM doctors WHERE id = $5),
            (SELECT is_active FROM doctors WHERE id = $5),
            (SELECT created_at FROM doctors WHERE id = $5)
          )
          RETURNING id
        `, [
          doctor.email || `doctor${doctor.id}@clinic.com`,
          '$2b$10$defaulthashedpassword',
          firstName,
          lastName,
          doctor.id
        ]);

        const newUserId = userResult.rows[0].id;
        doctorToUserMapping.set(doctor.id, newUserId);
        console.log(`✓ Migrated doctor ${doctor.id} (${doctor.name}) → user ${newUserId}`);
      } catch (error) {
        console.log(`⚠️  Could not migrate doctor ${doctor.id}: ${error.message}`);
      }
    }

    // Step 5: Update all foreign key references
    console.log("Updating foreign key references...");

    for (const [doctorId, userId] of doctorToUserMapping) {
      try {
        const visitUpdates = await pool.query(`
          UPDATE visits SET doctor_id = $1 WHERE doctor_id = $2
        `, [userId, doctorId]);
        if (visitUpdates.rowCount > 0) {
          console.log(`  ✓ Updated ${visitUpdates.rowCount} visits for doctor ${doctorId} → user ${userId}`);
        }

        const notesUpdates = await pool.query(`
          UPDATE clinical_notes SET doctor_id = $1 WHERE doctor_id = $2
        `, [userId, doctorId]);
        if (notesUpdates.rowCount > 0) {
          console.log(`  ✓ Updated ${notesUpdates.rowCount} clinical notes for doctor ${doctorId} → user ${userId}`);
        }

        const queueUpdates = await pool.query(`
          UPDATE queue SET doctor_id = $1 WHERE doctor_id = $2
        `, [userId, doctorId]);
        if (queueUpdates.rowCount > 0) {
          console.log(`  ✓ Updated ${queueUpdates.rowCount} queue entries for doctor ${doctorId} → user ${userId}`);
        }
      } catch (error) {
        console.log(`⚠️  Could not update references for doctor ${doctorId}: ${error.message}`);
      }
    }

    // Step 6: Handle any orphaned records by setting doctor_id to NULL
    console.log("Cleaning up orphaned doctor references...");

    const orphanedVisits = await pool.query(`
      UPDATE visits SET doctor_id = NULL
      WHERE doctor_id IS NOT NULL
      AND doctor_id NOT IN (SELECT id FROM users WHERE role IN ('doctor', 'head_doctor'))
      RETURNING id
    `);
    if (orphanedVisits.rowCount > 0) {
      console.log(`  ✓ Cleaned up ${orphanedVisits.rowCount} orphaned visits`);
    }

    const orphanedNotes = await pool.query(`
      UPDATE clinical_notes SET doctor_id = NULL
      WHERE doctor_id IS NOT NULL
      AND doctor_id NOT IN (SELECT id FROM users WHERE role IN ('doctor', 'head_doctor'))
      RETURNING id
    `);
    if (orphanedNotes.rowCount > 0) {
      console.log(`  ✓ Cleaned up ${orphanedNotes.rowCount} orphaned clinical notes`);
    }

    const orphanedQueue = await pool.query(`
      UPDATE queue SET doctor_id = NULL
      WHERE doctor_id IS NOT NULL
      AND doctor_id NOT IN (SELECT id FROM users WHERE role IN ('doctor', 'head_doctor'))
      RETURNING id
    `);
    if (orphanedQueue.rowCount > 0) {
      console.log(`  ✓ Cleaned up ${orphanedQueue.rowCount} orphaned queue entries`);
    }

    // Step 7: Add new foreign key constraints
    console.log("Adding foreign key constraints...");

    try {
      await pool.query(`
        ALTER TABLE visits
        ADD CONSTRAINT visits_doctor_id_users_id_fk
        FOREIGN KEY (doctor_id) REFERENCES users(id);
      `);
      console.log("✓ Added visits_doctor_id_users_id_fk");
    } catch (error) {
      console.log(`ℹ visits constraint: ${error.message}`);
    }

    try {
      await pool.query(`
        ALTER TABLE clinical_notes
        ADD CONSTRAINT clinical_notes_doctor_id_users_id_fk
        FOREIGN KEY (doctor_id) REFERENCES users(id);
      `);
      console.log("✓ Added clinical_notes_doctor_id_users_id_fk");
    } catch (error) {
      console.log(`ℹ clinical_notes constraint: ${error.message}`);
    }

    try {
      await pool.query(`
        ALTER TABLE queue
        ADD CONSTRAINT queue_doctor_id_users_id_fk
        FOREIGN KEY (doctor_id) REFERENCES users(id);
      `);
      console.log("✓ Added queue_doctor_id_users_id_fk");
    } catch (error) {
      console.log(`ℹ queue constraint: ${error.message}`);
    }

    // Step 8: Final verification
    const finalUserCount = await pool.query(`
      SELECT COUNT(*) FROM users WHERE role IN ('doctor', 'head_doctor')
    `);

    const finalVisitCount = await pool.query(`
      SELECT COUNT(*) FROM visits v
      WHERE v.doctor_id IS NOT NULL
    `);

    const validVisits = await pool.query(`
      SELECT COUNT(*) FROM visits v
      JOIN users u ON v.doctor_id = u.id
      WHERE u.role IN ('doctor', 'head_doctor')
    `);

    console.log("✅ Migration finalization completed!");
    console.log(`- Total doctor users: ${finalUserCount.rows[0].count}`);
    console.log(`- Total visits with doctor: ${finalVisitCount.rows[0].count}`);
    console.log(`- Valid visits (with doctor users): ${validVisits.rows[0].count}`);
    console.log(`- Doctor-user mappings: ${doctorToUserMapping.size}`);

  } catch (error) {
    console.error('❌ Migration finalization failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

finalizeMigration();