/**
 * Demo Data Seeding Script
 *
 * Adds demo patients with Uzbek names and visit history to clinic ID 1
 *
 * Run with: npm run db:seed
 */

import { db, pool } from "./db";
import { patients, visits, clinicalNotes, users } from "@shared/schema";
import { eq } from "drizzle-orm";

// Helper functions
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

// Uzbek names
const UZBEK_FIRST_NAMES = [
  'Aziz', 'Bobur', 'Dilshod', 'Eldor', 'Farrukh', 'Gulnora', 'Husniya', 'Islom',
  'Jamshid', 'Kamola', 'Laziz', 'Madina', 'Nodira', 'Odil', 'Parvina', 'Qodir',
  'Rustam', 'Sarvar', 'Temur', 'Umid', 'Vasila', 'Yulduz', 'Zarina', 'Akbar',
  'Bekzod', 'Charos', 'Dildora', 'Erkin', 'Feruza', 'Giyos', 'Halima', 'Ilhom',
  'Jasur', 'Komil', 'Lola', 'Murod', 'Nargiza', 'Otabek', 'Parizod', 'Rano',
  'Sherzod', 'Tohir', 'Ulugbek', 'Viloyat', 'Xurshid', 'Yoqub', 'Zilola', 'Anvar',
  'Behruz', 'Dilnoza', 'Elbek', 'Farida', 'Gulbahor', 'Hikmat', 'Iroda', 'Jahongir'
];

const UZBEK_LAST_NAMES = [
  'Karimov', 'Rahimov', 'Toshmatov', 'Yusupov', 'Alimov', 'Nazarov', 'Ergashev',
  'Saidov', 'Mamatov', 'Umarov', 'Xolmatov', 'Qodirov', 'Sultonov', 'Mirzayev',
  'Abdullayev', 'Raxmonov', 'Ismoilov', 'Nematov', 'Xasanov', 'Tursunov',
  'Jurayev', 'Bekmurodov', 'Olimov', 'Bobojonov'
];

const ADDRESSES = [
  'Toshkent, Chilonzor tumani', 'Toshkent, Yunusobod tumani', 'Toshkent, Mirzo Ulugbek tumani',
  'Toshkent, Sergeli tumani', 'Toshkent, Yakkasaroy tumani', 'Toshkent, Mirobod tumani',
  'Toshkent, Shayxontohur tumani', 'Toshkent, Olmazor tumani', 'Samarqand, Markaz',
  'Buxoro, Markaz', 'Namangan, Markaz', 'Andijon, Markaz', 'Fargona, Markaz'
];

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const VISIT_TYPES = ['Consultation', 'Follow-up', 'Dental', 'Emergency', 'Gynecology'] as const;

const CHIEF_COMPLAINTS = [
  'Routine checkup', 'Headache', 'Fever and cough', 'Back pain', 'Joint pain',
  'Skin rash', 'Digestive issues', 'Chest discomfort', 'Fatigue', 'Dizziness',
  'Dental pain', 'Eye irritation', 'Allergic reaction', 'Follow-up visit',
  'Vaccination', 'Blood pressure check', 'Diabetes management', 'Medication refill'
];

const DIAGNOSES = [
  'Upper Respiratory Infection', 'Tension Headache', 'Viral Gastroenteritis',
  'Lumbar Strain', 'Osteoarthritis', 'Contact Dermatitis', 'GERD',
  'Anxiety Disorder', 'Hypertension Stage 1', 'Type 2 Diabetes - Controlled',
  'Allergic Rhinitis', 'Conjunctivitis', 'Dental Caries', 'Gingivitis'
];

const MEDICATIONS = [
  'Paracetamol 500mg TDS', 'Ibuprofen 400mg BD', 'Omeprazole 20mg OD',
  'Metformin 500mg BD', 'Amlodipine 5mg OD', 'Cetirizine 10mg OD',
  'Amoxicillin 500mg TDS x 7 days', 'Vitamin D3 50000IU weekly'
];

async function seed() {
  console.log('🌱 Starting demo data seeding for clinic ID 1...\n');

  const clinicId = 1;

  try {
    // Get doctors from clinic 1
    const doctorsList = await db
      .select()
      .from(users)
      .where(eq(users.clinicId, clinicId));

    const doctors = doctorsList.filter(u => u.role === 'doctor' || u.role === 'head_doctor');

    if (doctors.length === 0) {
      console.log('⚠️  No doctors found in clinic 1. Please create doctors first.');
      console.log('   The dashboard needs doctors to assign visits to.');
      await pool.end();
      return;
    }

    console.log(`📋 Found ${doctors.length} doctor(s) in clinic 1`);

    // Create 40 patients with Uzbek names
    console.log('\n👥 Creating patients...');
    const createdPatients: Array<{ id: number; name: string }> = [];

    for (let i = 0; i < 40; i++) {
      const firstName = randomItem(UZBEK_FIRST_NAMES);
      const lastName = randomItem(UZBEK_LAST_NAMES);
      const age = randomInt(5, 75);
      const birthYear = new Date().getFullYear() - age;
      const dateOfBirth = `${birthYear}-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`;

      const [created] = await db.insert(patients).values({
        clinicId,
        name: `${firstName} ${lastName}`,
        phone: `+998 ${randomInt(90, 99)} ${randomInt(100, 999)} ${randomInt(10, 99)} ${randomInt(10, 99)}`,
        age,
        dateOfBirth,
        bloodType: randomItem(BLOOD_TYPES),
        address: randomItem(ADDRESSES),
        allergies: randomInt(0, 10) > 7 ? JSON.stringify(['Penicillin']) : null,
        chronicConditions: randomInt(0, 10) > 6 ? JSON.stringify(['Hypertension']) : null,
      }).returning();

      createdPatients.push({ id: created.id, name: `${firstName} ${lastName}` });
    }
    console.log(`✅ Created ${createdPatients.length} patients`);

    // Create 100 visits distributed over past 60 days
    console.log('\n📅 Creating visits...');
    const createdVisits: Array<{ id: number; status: string; doctorId: number }> = [];

    for (let i = 0; i < 100; i++) {
      const patient = randomItem(createdPatients);
      const doctor = randomItem(doctors);
      const daysAgoValue = randomInt(0, 60);
      const visitDate = daysAgo(daysAgoValue);

      // Status distribution: 65% Completed, 25% Scheduled, 10% Cancelled
      const r = Math.random();
      let status: string;
      if (daysAgoValue === 0) {
        status = r < 0.3 ? 'Completed' : (r < 0.8 ? 'Scheduled' : 'In-Progress');
      } else if (visitDate > new Date()) {
        status = 'Scheduled';
      } else {
        status = r < 0.65 ? 'Completed' : (r < 0.90 ? 'Scheduled' : 'Cancelled');
      }

      const visitType = randomItem(VISIT_TYPES);

      const [created] = await db.insert(visits).values({
        clinicId,
        patientId: patient.id,
        doctorId: doctor.id,
        visitDate: formatDate(visitDate),
        visitType,
        chiefComplaint: randomItem(CHIEF_COMPLAINTS),
        status,
      }).returning();

      createdVisits.push({ id: created.id, status, doctorId: doctor.id });

      // Update patient's last visit
      await db.update(patients)
        .set({ lastVisit: visitDate })
        .where(eq(patients.id, patient.id));
    }

    const completed = createdVisits.filter(v => v.status === 'Completed').length;
    const scheduled = createdVisits.filter(v => v.status === 'Scheduled').length;
    const cancelled = createdVisits.filter(v => v.status === 'Cancelled').length;

    console.log(`✅ Created ${createdVisits.length} visits`);
    console.log(`   - Completed: ${completed}`);
    console.log(`   - Scheduled: ${scheduled}`);
    console.log(`   - Cancelled: ${cancelled}`);

    // Create clinical notes for completed visits
    console.log('\n📝 Creating clinical notes...');
    let notesCreated = 0;
    const completedVisits = createdVisits.filter(v => v.status === 'Completed');

    for (const visit of completedVisits) {
      if (Math.random() > 0.2) { // 80% of completed visits get notes
        await db.insert(clinicalNotes).values({
          visitId: visit.id,
          doctorId: visit.doctorId,
          symptoms: 'Patient presented with reported symptoms.',
          clinicalExamination: 'Physical examination performed. Vitals stable.',
          diagnosis: randomItem(DIAGNOSES),
          treatmentGiven: 'Treatment administered as per protocol.',
          medications: randomItem(MEDICATIONS),
          recommendations: 'Follow up in 2 weeks if symptoms persist.',
          followUpNeeded: Math.random() > 0.5,
        });
        notesCreated++;
      }
    }
    console.log(`✅ Created ${notesCreated} clinical notes`);

    // Summary
    console.log('\n' + '═'.repeat(50));
    console.log('🎉 Demo data seeding completed!\n');
    console.log('📊 Summary:');
    console.log(`   • Clinic ID: ${clinicId}`);
    console.log(`   • Patients: ${createdPatients.length}`);
    console.log(`   • Visits: ${createdVisits.length}`);
    console.log(`   • Clinical Notes: ${notesCreated}`);
    console.log('\n💡 Start the server and check the Dashboard to see charts!');
    console.log('═'.repeat(50));

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed();
