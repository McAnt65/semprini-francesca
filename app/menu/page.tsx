import Image from "next/image";
import Link from "next/link";
import menuImage from "../../design-approved-phase1/07-menu.png";

const entries = [
  { label: "Oggi", href: "/oggi" },
  { label: "Studenti", href: "/studenti/home" },
  { label: "Lezioni", href: "/lezioni" },
  { label: "Materie", href: "/materie" },
  { label: "Calendario", href: "/calendario" },
  { label: "Pagamenti", href: "/tariffario/pagamenti" },
  { label: "Archivio", href: "/menu" },
  { label: "Impostazioni", href: "/menu" },
];

export default function MenuPage() {
  return <main className="min-h-dvh bg-[#fbf1de] text-[#4b3024]">
    <div className="relative mx-auto w-full max-w-[430px]">
      <Image src={menuImage} alt="" priority sizes="(max-width: 430px) 100vw, 430px" className="block h-auto w-full" />
      <h1 className="sr-only">Menu del Registro</h1>
      <Link href="/calendario/nuova" aria-label="Nuova lezione" className="absolute left-[4%] top-[1%] h-[8%] w-[27%] rounded-xl focus-visible:outline-2 focus-visible:outline-[#813247]" />
      <nav aria-label="Navigazione globale">
        {entries.map((entry, index) => {
          const style = { left: `${index % 2 ? 51 : 3}%`, top: `${28.6 + Math.floor(index / 2) * 14.5}%`, width: "46%", height: "13.8%" };
          const className = "absolute rounded-xl focus-visible:outline-2 focus-visible:outline-[#813247]";
          return <Link key={entry.label} href={entry.href} aria-label={entry.label} className={className} style={style} />;
        })}
      </nav>
    </div>
  </main>;
}
