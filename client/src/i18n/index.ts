import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// English translations
import enCommon from './locales/en/common.json';
import enDashboard from './locales/en/dashboard.json';
import enPatients from './locales/en/patients.json';
import enDoctors from './locales/en/doctors.json';
import enQueue from './locales/en/queue.json';
import enReports from './locales/en/reports.json';
import enUsers from './locales/en/users.json';
import enVisits from './locales/en/visits.json';
import enAuth from './locales/en/auth.json';

// Russian translations
import ruCommon from './locales/ru/common.json';
import ruDashboard from './locales/ru/dashboard.json';
import ruPatients from './locales/ru/patients.json';
import ruDoctors from './locales/ru/doctors.json';
import ruQueue from './locales/ru/queue.json';
import ruReports from './locales/ru/reports.json';
import ruUsers from './locales/ru/users.json';
import ruVisits from './locales/ru/visits.json';
import ruAuth from './locales/ru/auth.json';

// Uzbek translations
import uzCommon from './locales/uz/common.json';
import uzDashboard from './locales/uz/dashboard.json';
import uzPatients from './locales/uz/patients.json';
import uzDoctors from './locales/uz/doctors.json';
import uzQueue from './locales/uz/queue.json';
import uzReports from './locales/uz/reports.json';
import uzUsers from './locales/uz/users.json';
import uzVisits from './locales/uz/visits.json';
import uzAuth from './locales/uz/auth.json';

const resources = {
  en: {
    common: enCommon,
    dashboard: enDashboard,
    patients: enPatients,
    doctors: enDoctors,
    queue: enQueue,
    reports: enReports,
    users: enUsers,
    visits: enVisits,
    auth: enAuth,
  },
  ru: {
    common: ruCommon,
    dashboard: ruDashboard,
    patients: ruPatients,
    doctors: ruDoctors,
    queue: ruQueue,
    reports: ruReports,
    users: ruUsers,
    visits: ruVisits,
    auth: ruAuth,
  },
  uz: {
    common: uzCommon,
    dashboard: uzDashboard,
    patients: uzPatients,
    doctors: uzDoctors,
    queue: uzQueue,
    reports: uzReports,
    users: uzUsers,
    visits: uzVisits,
    auth: uzAuth,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'dashboard', 'patients', 'doctors', 'queue', 'reports', 'users', 'visits', 'auth'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
