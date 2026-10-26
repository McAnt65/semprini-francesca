import type { StudentRecord } from "../data/students";
import type { Tariff } from "../data/tariffario/tariff-types";
import type { CalendarAppointment, CalendarSeries, LessonMode, LessonStatus, PaymentStatus } from "../data/calendario/calendar-types";

export const TEST_MANIFEST_KEY = "semprini:test-dati:manifest:v1";
export const TRANSFER_MANIFEST_KEY = "semprini:test-dati:trasferimento:v1";
export const TRANSFER_MANIFEST = {
  giuliaExceptionId: "test-dati-2026-trasferimento-giulia-19",
  lorenzoAppointmentId: "test-dati-2026-trasferimento-lorenzo-19",
} as const;
export const TEST_MANIFEST = {
  students: ["test-dati-2026-giulia", "test-dati-2026-lorenzo", "test-dati-2026-sofia"],
  tariffs: ["test-dati-2026-standard", "test-dati-2026-avanzata"],
  appointments: [
    "test-dati-2026-g1", "test-dati-2026-g2", "test-dati-2026-l1", "test-dati-2026-l2",
    "test-dati-2026-l3", "test-dati-2026-s1", "test-dati-2026-s2", "test-dati-2026-s3",
  ],
  series: ["test-dati-2026-giulia-settimanale"],
} as const;

const stamp = "2026-10-17T09:00:00.000Z";
const noPhone = "0000000000";
const standard = TEST_MANIFEST.tariffs[0];
const advanced = TEST_MANIFEST.tariffs[1];

export const testTariffs: Tariff[] = [
  { id: standard, code: "TEST_STD", subject: "Standard [TEST]", schoolBand: "Secondaria [TEST]", mode: "domicilio", format: "singola", hourlyRateCents: 2000, active: true, createdAt: stamp, updatedAt: stamp },
  { id: advanced, code: "TEST_ADV", subject: "Avanzata [TEST]", schoolBand: "Secondaria [TEST]", mode: "online", format: "singola", hourlyRateCents: 2500, active: true, createdAt: stamp, updatedAt: stamp },
];

export const testStudents: StudentRecord[] = [
  {
    id: TEST_MANIFEST.students[0], status: "active", enrollmentDate: "2026-09-01", firstName: "Giulia", lastName: "Rossi [TEST]",
    birthDate: "2010-04-12", school: "Liceo Scientifico Aurora [TEST]", schoolType: "Liceo Scientifico", schoolName: "Aurora [TEST]", gradeClass: "3ª A", section: "A",
    phone: noPhone, whatsapp: noPhone, email: "giulia.rossi@example.invalid", address: "Via San Martino 80", postalCode: "47838", city: "Riccione", province: "RN",
    primaryParent: "Elena", primaryParentPhone: noPhone, primaryParentWhatsapp: noPhone, primaryParentEmail: "elena.rossi@example.invalid",
    secondaryParent: "Marco", secondaryParentPhone: noPhone, secondaryParentWhatsapp: noPhone, secondaryParentEmail: "marco.rossi@example.invalid",
    familyContacts: [{ id: "test-dati-2026-giulia-madre", firstName: "Elena", lastName: "Rossi [TEST]", relationship: "Madre", phone: noPhone, whatsapp: noPhone, email: "elena.rossi@example.invalid" }],
    primaryContactId: "test-dati-2026-giulia-madre", subjects: ["Matematica", "Fisica"],
    books: [{ title: "Algebra delle stelle [TEST]", publisher: "Edizioni Esempio [TEST]" }, { title: "Fisica in viaggio [TEST]", publisher: "Edizioni Esempio [TEST]" }],
    textbooks: { math: "Algebra delle stelle [TEST]", physics: "Fisica in viaggio [TEST]" },
    personalNotes: "In algebra fatica con le equazioni di secondo grado; lavora bene con esempi guidati.", familyNotes: "La madre segue i compiti settimanali.",
    topicsToDeepen: "Equazioni e funzioni", learningGoals: "Acquisire sicurezza nel calcolo algebrico", firstImpressions: "Curiosa e attenta, chiede chiarimenti quando serve.",
    interests: "Astronomia", strengths: "Costanza", lessonMode: "domicilio", lessonDurationMinutes: 60, lessonRateCents: 2000, tariffId: standard, updatedAt: stamp,
  },
  {
    id: TEST_MANIFEST.students[1], status: "active", enrollmentDate: "2026-09-03", firstName: "Lorenzo", lastName: "Bianchi [TEST]",
    birthDate: "2008-03-25", school: "Istituto Tecnico Orizzonte [TEST]", schoolType: "Istituto Tecnico", schoolName: "Orizzonte [TEST]", gradeClass: "5ª B", section: "B",
    phone: noPhone, whatsapp: noPhone, email: "lorenzo.bianchi@example.invalid", address: "Viale Lazio 10", postalCode: "47838", city: "Riccione", province: "RN",
    primaryParent: "Paola", primaryParentPhone: noPhone, primaryParentWhatsapp: noPhone, primaryParentEmail: "paola.bianchi@example.invalid",
    secondaryParent: "Davide", secondaryParentPhone: noPhone, secondaryParentWhatsapp: noPhone, secondaryParentEmail: "davide.bianchi@example.invalid",
    familyContacts: [{ id: "test-dati-2026-lorenzo-madre", firstName: "Paola", lastName: "Bianchi [TEST]", relationship: "Madre", phone: noPhone, whatsapp: noPhone, email: "paola.bianchi@example.invalid" }],
    primaryContactId: "test-dati-2026-lorenzo-madre", subjects: ["Fisica", "Chimica"],
    books: [{ title: "Onde e materia [TEST]", publisher: "Edizioni Laboratorio [TEST]" }, { title: "Chimica del possibile [TEST]", publisher: "Edizioni Laboratorio [TEST]" }],
    textbooks: { physics: "Onde e materia [TEST]", chemistry: "Chimica del possibile [TEST]" },
    personalNotes: "Prepara l'esame di maturità; preferisce schemi ordinati e problemi svolti passo per passo.", familyNotes: "Gli incontri online si concordano nel pomeriggio.",
    topicsToDeepen: "Elettromagnetismo e reazioni", learningGoals: "Ripassare il programma per la maturità", firstImpressions: "Autonomo, ma deve esercitarsi nell'esposizione orale.",
    interests: "Tecnologia", strengths: "Ragionamento pratico", lessonMode: "online", lessonDurationMinutes: 90, lessonRateCents: 2500, tariffId: advanced, updatedAt: stamp,
  },
  {
    id: TEST_MANIFEST.students[2], status: "active", enrollmentDate: "2026-09-05", firstName: "Sofia", lastName: "Conti [TEST]",
    birthDate: "2012-06-09", school: "Liceo delle Scienze Umane Nuvola [TEST]", schoolType: "Liceo delle Scienze Umane", schoolName: "Nuvola [TEST]", gradeClass: "1ª C", section: "C",
    phone: noPhone, whatsapp: noPhone, email: "sofia.conti@example.invalid", address: "Viale Vittorio Emanuele II 2", postalCode: "47838", city: "Riccione", province: "RN",
    primaryParent: "Chiara", primaryParentPhone: noPhone, primaryParentWhatsapp: noPhone, primaryParentEmail: "chiara.conti@example.invalid",
    secondaryParent: "Andrea", secondaryParentPhone: noPhone, secondaryParentWhatsapp: noPhone, secondaryParentEmail: "andrea.conti@example.invalid",
    familyContacts: [{ id: "test-dati-2026-sofia-madre", firstName: "Chiara", lastName: "Conti [TEST]", relationship: "Madre", phone: noPhone, whatsapp: noPhone, email: "chiara.conti@example.invalid" }],
    primaryContactId: "test-dati-2026-sofia-madre", subjects: ["Matematica", "Chimica"],
    books: [{ title: "Numeri in fiore [TEST]", publisher: "Edizioni Quaderno [TEST]" }, { title: "Primi esperimenti [TEST]", publisher: "Edizioni Quaderno [TEST]" }],
    textbooks: { math: "Numeri in fiore [TEST]", chemistry: "Primi esperimenti [TEST]" },
    personalNotes: "Apprende bene con esempi illustrati; sta consolidando le frazioni.", familyNotes: "Le lezioni si svolgono a casa dell'insegnante.",
    topicsToDeepen: "Frazioni e tavola periodica", learningGoals: "Rendere più sicuro il metodo di studio", firstImpressions: "Partecipa con entusiasmo alle attività pratiche.",
    interests: "Disegno", strengths: "Creatività", lessonMode: "casa", lessonDurationMinutes: 60, lessonRateCents: 2000, tariffId: standard, updatedAt: stamp,
  },
];

export const testStudentAddresses = testStudents.map(({ id, address, postalCode, city, province }) => ({
  id, address, postalCode, city, province,
}));

function lesson(
  id: string, student: 0 | 1 | 2, date: string, startTime: string, subject: string,
  status: LessonStatus, topic: string, notes: string, paidAmountCents: number,
  durationMinutes = 60,
): CalendarAppointment {
  const person = testStudents[student];
  const tariff = testTariffs[student === 1 ? 1 : 0];
  const lessonAmountCents = Math.round(tariff.hourlyRateCents * durationMinutes / 60);
  const paymentStatus: PaymentStatus = status === "annullata" ? "non_dovuta" : paidAmountCents >= lessonAmountCents ? "pagata" : paidAmountCents > 0 ? "parziale" : "non_pagata";
  return {
    id, studentId: person.id, studentNameSnapshot: `${person.firstName} ${person.lastName}`,
    date, startTime, subject, durationMinutes, mode: person.lessonMode as LessonMode,
    status, topic, notes, hourlyRateCents: tariff.hourlyRateCents, lessonAmountCents: status === "annullata" ? 0 : lessonAmountCents,
    paidAmountCents, paymentStatus, tariffId: tariff.id, tariffCode: tariff.code,
    source: "manuale", createdAt: stamp, updatedAt: stamp,
  };
}

export const testAppointments: CalendarAppointment[] = [
  lesson(TEST_MANIFEST.appointments[0], 0, "2026-10-05", "16:00", "Matematica", "svolta", "Equazioni di secondo grado", "Ha risolto gli esercizi guidati; riprendere la scomposizione.", 1000),
  lesson(TEST_MANIFEST.appointments[1], 0, "2026-10-12", "16:00", "Fisica", "svolta", "Moto rettilineo", "Buona comprensione dei grafici; assegnati tre problemi.", 0),
  lesson(TEST_MANIFEST.appointments[2], 1, "2026-10-07", "17:30", "Fisica", "svolta", "Campi elettrici", "Ripasso mirato per l'esame; esercitare l'esposizione orale.", 0, 90),
  lesson(TEST_MANIFEST.appointments[3], 1, "2026-10-14", "17:30", "Chimica", "annullata", "Reazioni redox", "Incontro annullato, nessun importo dovuto.", 0, 90),
  lesson(TEST_MANIFEST.appointments[4], 1, "2026-10-22", "17:30", "Chimica", "confermata", "Reazioni redox", "Preparare esercizi per la maturità.", 0, 90),
  lesson(TEST_MANIFEST.appointments[5], 2, "2026-10-06", "15:30", "Matematica", "svolta", "Frazioni equivalenti", "Ha usato bene gli schemi colorati.", 2000),
  lesson(TEST_MANIFEST.appointments[6], 2, "2026-10-13", "15:30", "Chimica", "svolta", "La tavola periodica", "Riconosce i gruppi principali; ripassare i simboli.", 2000),
  lesson(TEST_MANIFEST.appointments[7], 2, "2026-10-21", "15:30", "Matematica", "confermata", "Operazioni con le frazioni", "Portare il quaderno degli esercizi.", 0),
];

export const testSeries: CalendarSeries[] = [{
  id: TEST_MANIFEST.series[0], studentId: testStudents[0].id,
  studentNameSnapshot: "Giulia Rossi [TEST]", subject: "Matematica", durationMinutes: 60,
  mode: "domicilio", status: "confermata", topic: "Algebra e funzioni",
  notes: "Incontro settimanale di esercitazione.", hourlyRateCents: 2000,
  lessonAmountCents: 2000, paidAmountCents: 0, paymentStatus: "non_pagata",
  tariffId: standard, tariffCode: testTariffs[0].code,
  startsOn: "2026-10-19", startTime: "16:00",
  recurrence: { frequency: "weekly", intervalWeeks: 1, endsOn: "2026-11-09" },
  source: "manuale", createdAt: stamp, updatedAt: stamp,
}];

export const transferLorenzoAppointment: CalendarAppointment = {
  ...testAppointments[4],
  id: TRANSFER_MANIFEST.lorenzoAppointmentId,
  date: "2026-10-19",
  startTime: "16:30",
  durationMinutes: 60,
  subject: "Fisica",
  mode: "domicilio",
  topic: "Preparazione alla prova di fisica",
  notes: "Lezione dimostrativa per la verifica dell'intervallo tra due appuntamenti.",
  hourlyRateCents: 2500,
  lessonAmountCents: 2500,
  paidAmountCents: 0,
  paymentStatus: "non_pagata",
};
