'use client';

import Link from 'next/link';

export default function MenuContent() {
  return (
    <div className="relative w-full max-w-[430px] min-h-[932px] mx-auto bg-[url('/menu.png')] bg-cover bg-center p-6 flex flex-col justify-between select-none">
      
      {/* Header del Menu */}
      <div className="pt-8 text-center">
        <h1 className="font-serif text-2xl text-[#3C2A21] italic tracking-wide">
          Benvenuta, Francesca
        </h1>
        <div className="flex items-center justify-center gap-2 text-[#8C6D53] my-1">
          <span className="h-[1px] w-8 bg-[#8C6D53]/40"></span>
          <span className="text-xs">♡</span>
          <span className="h-[1px] w-8 bg-[#8C6D53]/40"></span>
        </div>
      </div>

      {/* Griglia Principale 3x3 */}
      <div className="grid grid-cols-3 gap-3 my-auto">
        
        {/* I miei studenti */}
        <Link href="/studenti" className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#F5EFEB]/40 hover:bg-[#F5EFEB]/80 transition-all border border-[#8C6D53]/20 text-center group">
          <span className="font-serif text-sm text-[#3C2A21]">I miei studenti</span>
        </Link>

        {/* Calendario */}
        <Link href="/calendario" className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#F5EFEB]/40 hover:bg-[#F5EFEB]/80 transition-all border border-[#8C6D53]/20 text-center group">
          <span className="font-serif text-sm text-[#3C2A21]">Calendario</span>
        </Link>

        {/* Materie */}
        <Link href="/materie" className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#F5EFEB]/40 hover:bg-[#F5EFEB]/80 transition-all border border-[#8C6D53]/20 text-center group">
          <span className="font-serif text-sm text-[#3C2A21]">Materie</span>
        </Link>

        {/* Libri di testo */}
        <Link href="/libri" className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#F5EFEB]/40 hover:bg-[#F5EFEB]/80 transition-all border border-[#8C6D53]/20 text-center group">
          <span className="font-serif text-sm text-[#3C2A21]">Libri di testo</span>
        </Link>

        {/* Archivio condiviso */}
        <Link href="/archivio-condiviso" className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#F5EFEB]/40 hover:bg-[#F5EFEB]/80 transition-all border border-[#8C6D53]/20 text-center group">
          <span className="font-serif text-sm text-[#3C2A21]">Archivio condiviso</span>
        </Link>

        {/* Archivio personale */}
        <Link href="/archivio-personale" className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#F5EFEB]/40 hover:bg-[#F5EFEB]/80 transition-all border border-[#8C6D53]/20 text-center group">
          <span className="font-serif text-sm text-[#3C2A21]">Archivio personale</span>
        </Link>

        {/* Richieste lezioni */}
        <Link href="/richieste" className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#F5EFEB]/40 hover:bg-[#F5EFEB]/80 transition-all border border-[#8C6D53]/20 text-center group">
          <span className="font-serif text-sm text-[#3C2A21]">Richieste lezioni</span>
        </Link>

        {/* Lezioni a domicilio */}
        <Link href="/domicilio" className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#F5EFEB]/40 hover:bg-[#F5EFEB]/80 transition-all border border-[#8C6D53]/20 text-center group">
          <span className="font-serif text-sm text-[#3C2A21]">Lezioni a domicilio</span>
        </Link>

        {/* Tariffe e pagamenti */}
        <Link href="/tariffe" className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#F5EFEB]/40 hover:bg-[#F5EFEB]/80 transition-all border border-[#8C6D53]/20 text-center group">
          <span className="font-serif text-sm text-[#3C2A21]">Tariffe e pagamenti</span>
        </Link>

      </div>

      {/* Banner inferiore - Diario della professoressa */}
      <div className="pb-6">
        <Link href="/diario" className="block w-full py-4 px-6 rounded-2xl bg-[#F5EFEB]/50 hover:bg-[#F5EFEB]/90 transition-all border border-[#8C6D53]/30 text-center">
          <span className="font-serif text-lg text-[#3C2A21] italic">Diario della professoressa</span>
          <div className="text-xs text-[#8C6D53] mt-1">♡</div>
        </Link>
      </div>

    </div>
  );
}
