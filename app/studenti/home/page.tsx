import Image from "next/image";
import Link from "next/link";
import cover from "../../../design-approved-phase1/02-studenti-home-final.png";

const sections = [
  { label: "I miei studenti", href: "/studenti" },
  { label: "Nuovo studente", href: "/studenti/nuovo" },
  { label: "Diario studenti", href: "/studenti/diario" },
  { label: "Archivio studenti", href: "/studenti/archivio" },
];

export default function StudentsHomePage() {
  return <main className="min-h-dvh bg-[#fbf1de] text-[#4b3024]">
    <div className="relative mx-auto w-full max-w-[430px]">
      <Image src={cover} alt="" priority sizes="(max-width: 430px) 100vw, 430px" className="block h-auto w-full" />
      <h1 className="sr-only">Studenti</h1>
      <Link href="/studenti/nuovo" aria-label="Nuovo Studente" className="absolute left-[3%] top-[1%] h-[8%] w-[31%] rounded-xl focus-visible:outline-2 focus-visible:outline-[#813247]" />
      <Link href="/menu" aria-label="Menu" className="absolute right-[3%] top-[1%] h-[8%] w-[22%] rounded-xl focus-visible:outline-2 focus-visible:outline-[#813247]" />
      <nav aria-label="Sezione Studenti">
        {sections.map((section, index) => {
          const style = { left: `${index % 2 ? 50 : 3}%`, top: `${29.5 + Math.floor(index / 2) * 28}%`, width: "47%", height: "27%" };
          const className = "absolute rounded-xl focus-visible:outline-2 focus-visible:outline-[#813247]";
          return <Link key={section.label} href={section.href} aria-label={section.label} className={className} style={style} />;
        })}
      </nav>
    </div>
  </main>;
}
