import type { StudentFamilyContact, StudentRecord, StudentTeacher } from "../../data/students";
import type { ReactNode } from "react";
import styles from "./nuovo.module.css";

const filled = (value?: string) => value?.trim() || "";
const personName = (person: { firstName: string; lastName: string }) => [filled(person.firstName), filled(person.lastName)].filter(Boolean).join(" ");
const Value = ({ children }: { children: ReactNode }) => <span className={styles.value}>{children}</span>;

function dateLabel(value?: string) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function ageFrom(value: string, today: string) {
  if (!value || !today) return null;
  const birth = new Date(`${value}T12:00:00`);
  const current = new Date(`${today}T12:00:00`);
  if (Number.isNaN(birth.getTime()) || birth > current) return null;
  return current.getFullYear() - birth.getFullYear() - (current.getMonth() < birth.getMonth() || (current.getMonth() === birth.getMonth() && current.getDate() < birth.getDate()) ? 1 : 0);
}

export function StudentReadChapter({ student, today }: { student: StudentRecord; today: string }) {
  const birth = dateLabel(student.birthDate);
  const age = ageFrom(student.birthDate, today);
  const grade = filled(student.gradeClass);
  const section = filled(student.section);
  const school = filled(student.schoolName || student.school);
  const city = filled(student.city);
  const course = filled(student.studyCourse);
  const phone = filled(student.phone);
  const whatsapp = filled(student.whatsapp);
  const email = filled(student.email);
  const subjects = student.subjects.map(filled).filter(Boolean);
  return <>
    {birth && <p>È nato/a il <Value>{birth}</Value>{age !== null && <> e ha <Value>{age}</Value> anni</>}.</p>}
    {(grade || section || school || city || course) && <p>
      {grade && <>Frequenta il <Value>{grade}</Value>. </>}
      {section && <>È nella sezione <Value>{section}</Value>. </>}
      {school && <>Studia presso <Value>{school}</Value>. </>}
      {city && <>Studia a <Value>{city}</Value>. </>}
      {course && <>Segue l&apos;indirizzo di studi <Value>{course}</Value>.</>}
    </p>}
    {(phone || whatsapp || email) && <p>
      {phone && <>Il suo numero di cellulare è <Value>{phone}</Value>. </>}
      {whatsapp && (phone && whatsapp === phone ? <>Il numero di cellulare è utilizzabile anche per WhatsApp. </> : <>Il suo numero WhatsApp è <Value>{whatsapp}</Value>. </>)}
      {email && <>Il suo indirizzo di posta elettronica è <Value>{email}</Value>.</>}
    </p>}
    {subjects.length > 0 && <p>Ci dedicheremo insieme allo studio di <Value>{subjects.join(", ")}</Value>, cercando, con pazienza e buona volontà, di rendere più chiaro ciò che oggi gli/le appare difficile.</p>}
  </>;
}

function FamilyPerson({ person, role }: { person: StudentFamilyContact; role: "mamma" | "padre" }) {
  const name = personName(person);
  const phone = filled(person.phone);
  const whatsapp = filled(person.whatsapp);
  const email = filled(person.email);
  if (!name && !phone && !whatsapp && !email) return null;
  const prefix = role === "mamma" ? "Sua mamma" : "Suo padre";
  const article = role === "mamma" ? "della mamma" : "del padre";
  return <p>
    {name && <>{prefix} si chiama <Value>{name}</Value>. </>}
    {phone && <>Il cellulare {article} è <Value>{phone}</Value>. </>}
    {whatsapp && <>Il numero WhatsApp {article} è <Value>{whatsapp}</Value>. </>}
    {email && <>L&apos;email {article} è <Value>{email}</Value>.</>}
  </p>;
}

function OtherContact({ person }: { person: StudentFamilyContact }) {
  const name = personName(person);
  const relation = filled(person.relationship);
  const phone = filled(person.phone);
  const whatsapp = filled(person.whatsapp);
  const email = filled(person.email);
  if (!name && !phone && !whatsapp && !email) return null;
  return <div className={styles.familyContact}>
    {name && <p>Fra i contatti familiari c&apos;è <Value>{name}</Value>{relation && <> (<Value>{relation}</Value>)</>}.</p>}
    {phone && <p>{name ? "Il suo cellulare è " : "Un contatto familiare è raggiungibile al numero "}<Value>{phone}</Value>.</p>}
    {whatsapp && <p>Il suo numero WhatsApp è <Value>{whatsapp}</Value>.</p>}
    {email && <p>La sua email è <Value>{email}</Value>.</p>}
  </div>;
}

function TeacherParagraph({ teacher }: { teacher: StudentTeacher }) {
  const subject = filled(teacher.subject);
  const name = personName(teacher);
  const phone = filled(teacher.phone);
  const email = filled(teacher.email);
  if (!subject && !name && !phone && !email) return null;
  return <>
    {name && <p>{subject ? <>L&apos;insegnante di <Value>{subject}</Value> è </> : "Il suo insegnante è "}<Value>{name}</Value>.</p>}
    {subject && !name && <p>La materia di riferimento a scuola è <Value>{subject}</Value>.</p>}
    {phone && <p>Il docente è raggiungibile al numero <Value>{phone}</Value>.</p>}
    {email && <p>Il suo indirizzo email è <Value>{email}</Value>.</p>}
  </>;
}

export function StudentReadSections({ student }: { student: StudentRecord }) {
  const city = filled(student.city);
  const address = filled(student.address);
  const contacts = student.familyContacts || [];
  const mother = contacts.find((person) => ["madre", "mamma"].includes(person.relationship?.toLowerCase() || ""));
  const father = contacts.find((person) => ["padre", "papà"].includes(person.relationship?.toLowerCase() || ""));
  const others = contacts.filter((person) => person.id !== mother?.id && person.id !== father?.id);
  const primary = filled(personName(contacts.find((person) => person.id === student.primaryContactId) || { firstName: "", lastName: "" }) || student.primaryParent);
  const hasContact = (person?: StudentFamilyContact) => Boolean(person && [person.firstName, person.lastName, person.phone, person.whatsapp, person.email].some(filled));
  const familyVisible = Boolean(city || address || primary || hasContact(mother) || hasContact(father) || others.some(hasContact));
  const books = (student.books || []).filter((book) => filled(book.title) || filled(book.publisher));
  const topics = filled(student.topicsToDeepen);
  const teachers = (student.teachers || []).filter((person) => [person.subject, person.firstName, person.lastName, person.phone, person.email].some(filled));
  const impressions = filled(student.firstImpressions);
  const interests = filled(student.interests);
  const passions = filled(student.passions);
  const activities = filled(student.preferredActivities);
  const notes = filled(student.personalNotes);
  const start = dateLabel(student.learningStartDate);
  const goals = filled(student.learningGoals);
  return <>
    {familyVisible && <section aria-labelledby="famiglia"><h2 id="famiglia">LA SUA FAMIGLIA E LA SUA CASA</h2>
      {(city || address) && <p>Abita{city && <> a <Value>{city}</Value></>}{address && <>{city ? ", in " : " in "}<Value>{address}</Value></>}.</p>}
      {mother && <FamilyPerson person={mother} role="mamma" />}
      {father && <FamilyPerson person={father} role="padre" />}
      {primary && <p>Per le comunicazioni riguardanti le lezioni potrò fare riferimento principalmente a <Value>{primary}</Value>.</p>}
      {others.map((person) => <OtherContact key={person.id} person={person} />)}
    </section>}
    {(books.length > 0 || topics) && <section aria-labelledby="libri"><h2 id="libri">I SUOI LIBRI E IL SUO CAMMINO SCOLASTICO</h2>
      {books.length > 0 && <><p>Per lo studio faremo riferimento a questi libri.</p><ul className={styles.bookList} aria-label="Libri di testo">{books.map((book, index) => <li key={index}><Value>{[filled(book.title), filled(book.publisher)].filter(Boolean).join(" — ")}</Value></li>)}</ul></>}
      {topics && <p>Gli argomenti sui quali sarà bene soffermarci sono <Value>{topics}</Value>.</p>}
    </section>}
    {teachers.length > 0 && <section aria-labelledby="professori"><h2 id="professori">I PROFESSORI DI RIFERIMENTO</h2>{teachers.map((teacher) => <TeacherParagraph key={teacher.id} teacher={teacher} />)}</section>}
    {(impressions || interests || passions || activities || notes) && <section aria-labelledby="pensiero"><h2 id="pensiero">QUALCHE PENSIERO SU DI LUI/LEI</h2>
      {impressions && <p>Da quanto ho potuto conoscere, <Value>{student.firstName}</Value> è <Value>{impressions}</Value>.</p>}
      {(interests || passions) && <p>Le cose che più lo/la interessano sono <Value>{[interests, passions].filter(Boolean).join(", ")}</Value>.</p>}
      {activities && <p>Nel tempo libero ama <Value>{activities}</Value>.</p>}
      {notes && <p>Mi sembra importante ricordare anche <Value>{notes}</Value>.</p>}
    </section>}
    {(start || goals) && <section aria-labelledby="percorso"><h2 id="percorso">IL NOSTRO PERCORSO</h2>
      {start && <p>Inizieremo a lavorare insieme dal <Value>{start}</Value>.</p>}
      {goals && <p>Dedicheremo particolare attenzione a <Value>{goals}</Value>.</p>}
    </section>}
  </>;
}
