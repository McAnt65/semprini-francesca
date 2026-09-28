"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createTariff, isTariffCodeAvailable, loadTariffs, nextTariffCode, saveTariffs, updateTariff } from "../data/tariffario/tariff-storage";
import type { Tariff, TariffDraft, LessonFormat } from "../data/tariffario/tariff-types";
import type { LessonMode } from "../data/calendario/calendar-types";
const money=(c:number)=>new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(c/100);
const modes:Record<LessonMode,string>={casa:"Casa / studio",domicilio:"A domicilio",online:"Online"};
export default function TariffsPage(){
 const router=useRouter(); const [tariffs,setTariffs]=useState<Tariff[]>([]),[draft,setDraft]=useState<TariffDraft|null>(null),[editing,setEditing]=useState<string|null>(null),[error,setError]=useState("");
 useEffect(()=>{queueMicrotask(()=>setTariffs(loadTariffs()));},[]);
 function open(item?:Tariff){setEditing(item?.id??null);setDraft(item?{code:item.code,subject:item.subject,schoolBand:item.schoolBand,mode:item.mode,format:item.format,hourlyRateCents:item.hourlyRateCents,active:item.active}:{code:nextTariffCode(tariffs),subject:"",schoolBand:"",mode:"casa",format:"singola",hourlyRateCents:0,active:true});setError("");}
 function save(){if(!draft)return;const code=draft.code.trim().toUpperCase();if(!isTariffCodeAvailable(code,tariffs,editing??undefined)){setError("Scegli una sigla univoca di 1–12 lettere, numeri, _ o -.");return;}
  if(!draft.subject.trim()||!draft.schoolBand.trim()||draft.hourlyRateCents<=0){setError("Compila materia, fascia e importo.");return;}
  const clean={...draft,code,subject:draft.subject.trim(),schoolBand:draft.schoolBand.trim()};const next=editing?tariffs.map(t=>t.id===editing?updateTariff(t,clean):t):[...tariffs,createTariff(clean)];
  if(!saveTariffs(next)){setError("Salvataggio non riuscito sul dispositivo.");return;}setTariffs(loadTariffs());setDraft(null);
 }
 const field="h-full w-full appearance-none border-0 bg-transparent px-2 font-entry-elegant text-[clamp(12px,3.5vw,17px)] text-[#493025] outline-none focus-visible:ring-1 focus-visible:ring-[#813247]";
 return <main className="min-h-dvh overflow-x-hidden bg-[#efe3ce]"><div className="mx-auto w-full max-w-[430px] sm:py-3"><div className="relative aspect-[941/1672] min-h-dvh w-full overflow-hidden sm:min-h-0 sm:rounded-[28px]">
 <Image src="/tariffe-watercolor.png" alt="" fill priority unoptimized sizes="(max-width: 430px) 100vw, 430px" className="pointer-events-none object-fill"/>
 <button aria-label="Indietro" onClick={()=>router.back()} className="absolute left-[3%] top-[1%] h-[8%] w-[24%]"/><Link href="/menu" aria-label="Menu" className="absolute right-[3%] top-[1%] h-[9%] w-[17%]"/>
 <Link href="/tariffario/pagamenti" aria-label="Pagamenti" className="absolute left-[50%] top-[22.7%] h-[4.7%] w-[45%]"/>
 <button aria-label="Aggiungi tariffa" onClick={()=>open()} className="absolute left-[31%] top-[28%] h-[5.6%] w-[38%]"/>
 <section aria-label="Tariffe base" className="absolute left-[5%] top-[34.8%] h-[39.1%] w-[90%] overflow-y-auto px-[2%] py-[2%] font-entry-elegant [scrollbar-width:thin]">
 {tariffs.length===0?<p className="mt-8 text-center italic text-[#745541]">Aggiungi la prima tariffa</p>:tariffs.map(t=><div key={t.id} className={`mb-2 flex items-center gap-2 border-b border-[#a98c6b]/35 py-2 text-[#4d3327] ${t.active?"":"opacity-55"}`}>
 <button onClick={()=>open(t)} className="min-w-0 flex-1 text-left"><span className="block truncate text-[clamp(13px,3.6vw,17px)]"><strong className="mr-2 text-[#843247]">{t.code}</strong>{t.subject} · {t.schoolBand}</span><span className="block truncate text-[clamp(11px,3vw,14px)]">{modes[t.mode]} · {t.format==="gruppo"?"Gruppo":"Singola"} · {money(t.hourlyRateCents)}/h{!t.active?" · Non attiva":""}</span></button>
 <button onClick={()=>open(t)} aria-label={`Modifica ${t.code}`} className="p-2 text-[#813247]">✎</button></div>)}
 </section>
 <nav aria-label="Navigazione principale" className="absolute inset-x-[2%] bottom-[1%] h-[10%]">{[["/studenti","Studenti"],["/calendario","Calendario"],["/calendario/nuova","Lezione"],["/materie","Materie"],["/menu","Menu"]].map(([href,label],i)=><Link key={label} href={href} aria-label={label} className="absolute inset-y-0 w-[20%]" style={{left:`${i*20}%`}}/>)}</nav>
 {draft&&<div role="dialog" aria-modal="true" aria-label={editing?"Modifica tariffa":"Aggiungi tariffa"} className="absolute inset-0 z-40 overflow-hidden">
 <Image src="/tariff-editor-clean.png" alt="" fill unoptimized sizes="(max-width: 430px) 100vw, 430px" className="pointer-events-none object-fill"/>
 <button aria-label="Chiudi" onClick={()=>setDraft(null)} className="absolute left-[3%] top-[1%] h-[8%] w-[26%]"/><Link href="/menu" aria-label="Menu" className="absolute right-[3%] top-[1%] h-[9%] w-[17%]"/>
 {[["Sigla","code","29.8%"],["Materia","subject","35.2%"],["Fascia scolastica","schoolBand","40.5%"]].map(([label,key,top])=><label key={key} className="absolute left-[41%] h-[4%] w-[49%]" style={{top}}><span className="sr-only">{label}</span><input value={String(draft[key as "code"|"subject"|"schoolBand"])} onChange={e=>setDraft({...draft,[key]:e.target.value})} className={field}/></label>)}
 <label className="absolute left-[41%] top-[45.9%] h-[4%] w-[49%]"><span className="sr-only">Modalità</span><select value={draft.mode} onChange={e=>setDraft({...draft,mode:e.target.value as LessonMode})} className={field}><option value="casa">Casa / studio</option><option value="domicilio">A domicilio</option><option value="online">Online</option></select></label>
 <label className="absolute left-[41%] top-[51.3%] h-[4%] w-[49%]"><span className="sr-only">Tipo di lezione</span><select value={draft.format} onChange={e=>setDraft({...draft,format:e.target.value as LessonFormat})} className={field}><option value="singola">Singola</option><option value="gruppo">Gruppo</option></select></label>
 <label className="absolute left-[41%] top-[56.7%] h-[4%] w-[49%]"><span className="sr-only">Prezzo orario in euro</span><input type="number" inputMode="decimal" min="0.01" step="0.01" value={draft.hourlyRateCents?draft.hourlyRateCents/100:""} onChange={e=>setDraft({...draft,hourlyRateCents:Math.round(Number(e.target.value)*100)})} className={field}/></label>
 <label className="absolute left-[40%] top-[62%] h-[4.5%] w-[15%] cursor-pointer"><span className="sr-only">Tariffa attiva</span><input type="checkbox" checked={draft.active} onChange={e=>setDraft({...draft,active:e.target.checked})} className="absolute inset-0 h-full w-full cursor-pointer opacity-0"/><span aria-hidden="true" className={`pointer-events-none absolute top-[12%] h-[76%] w-[45%] rounded-full border border-[#b68550] bg-[#fff5e2]/90 shadow-sm transition-[left] ${draft.active?"left-[49%]":"left-[2%]"}`}/></label>
 {error&&<p role="alert" className="absolute left-[12%] top-[67%] w-[76%] bg-[#fff5e5]/95 text-center font-entry-elegant text-[clamp(11px,3vw,15px)] text-[#a62b42]">{error}</p>}
 <button onClick={()=>setDraft(null)} aria-label="Annulla" className="absolute left-[8%] top-[70.5%] h-[6%] w-[37%]"/><button onClick={save} aria-label="Salva tariffa" className="absolute left-[51%] top-[70.5%] h-[6%] w-[40%]"/>
 <nav aria-label="Navigazione principale" className="absolute inset-x-[2%] bottom-[1%] h-[10%]">{[["/studenti","Studenti"],["/calendario","Calendario"],["/calendario/nuova","Lezione"],["/materie","Materie"],["/menu","Menu"]].map(([href,label],i)=><Link key={label} href={href} aria-label={label} className="absolute inset-y-0 w-[20%]" style={{left:`${i*20}%`}}/>)}</nav>
 </div>}
 </div></div></main>;
}
