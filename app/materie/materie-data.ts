export type SubjectSlug = "matematica" | "fisica" | "chimica";

export const subjects: Record<SubjectSlug, {
  title: string;
  image: string;
  topics: string[];
  quick: string[];
}> = {
  matematica: {
    title: "Matematica",
    image: "/materia-matematica-watercolor.png",
    topics: ["Algebra", "Equazioni", "Disequazioni", "Funzioni", "Geometria", "Trigonometria", "Analisi"],
    quick: ["Regola 1", "Regola 2", "Regola 3"],
  },
  fisica: {
    title: "Fisica",
    image: "/materia-fisica-watercolor.png",
    topics: ["Cinematica", "Dinamica", "Lavoro ed energia", "Termodinamica", "Elettromagnetismo", "Ottica"],
    quick: ["Formule", "Concetti chiave", "Appunti"],
  },
  chimica: {
    title: "Chimica",
    image: "/materia-chimica-watercolor.png",
    topics: ["Atomi e molecole", "Legami chimici", "Stechiometria", "Reazioni", "Acidi e basi", "Chimica organica"],
    quick: ["Formule importanti", "Appunti veloci", "Da ricordare"],
  },
};

export function isSubjectSlug(value: string): value is SubjectSlug {
  return Object.prototype.hasOwnProperty.call(subjects, value);
}

export const contentKey = (subject: SubjectSlug, section: string) =>
  `semprini:materie:v1:${subject}:${section}`;
