"use client";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { isLocalDate, isLocalTime, toLocalDate } from "../../../data/calendario/calendar-dates";
import { selectDayOccurrences } from "../../../data/calendario/calendar-selectors";
import { createSingleOccurrenceException } from "../../../data/calendario/calendar-recurrence";
import { loadCalendarAppointments, loadCalendarSeries, upsertCalendarAppointment } from "../../../data/calendario/calendar-storage";
import type { CalendarAppointment, LessonMode, LessonStatus, PaymentStatus } from "../../../data/calendario/calendar-types";
export default function EditPage(){return <Suspense fallback={<main className="min-h-dvh bg-[#efe3ce]"/>}><Edit/></Suspense>;}
function Edit(){
 const params=useParams(),search=useSearchParams(),router=useRouter();const id=decodeURIComponent(String(params.id));
 const requested=search.get("data"), date=isLocalDate(requested)?requested:toLocalDate(new Date());
 const [item,setItem]=useState<CalendarAppointment|null>(null),[error,setError]=useState("");
 useEffect(()=>{queueMicrotask(()=>{
  const appointments=loadCalendarAppointments(),series=loadCalendarSeries();
  const match=selectDayOccurrences(appointments,series,date).find(x=>x.occurrenceId===id||x.appointmentId===id);
  if(!match){setError("Lezione non trovata in questa data.");return;}
  const existing=appointments.find(x=>x.id===match.appointmentId);
  const source=series.find(x=>x.id===match.seriesId);
  const appointment=existing??(source?createSingleOccurrenceException(source,match.originalOccurrenceDate??match.date,crypto.randomUUID(),{}):null);
  if(appointment)setItem(appointment);else setError("Lezione non trovata.");
 });},[id,date]);
 function save(event:FormEvent){event.preventDefault();if(!item)return;
  if(!isLocalDate(item.date)||!isLocalTime(item.startTime)||item.durationMinutes<15){setError("Controlla data, ora e durata.");return;}
  const next={...item,lessonAmountCents:Math.round(item.hourlyRateCents*item.durationMinutes/60),updatedAt:new Date().toISOString()};
  if(!upsertCalendarAppointment(next)){setError("Salvataggio non riuscito.");return;}
  router.push(`/calendario/giorno?data=${next.date}`);
 }
 const field="w-full rounded-md border border-[#a88c70]/45 bg-[#fff9ed]/65 px-3 py-2 font-entry-elegant text-[#4b3024]";
 return <main className="min-h-dvh bg-[#efe3ce] px-4 py-8 text-[#4b3024]"><div className="mx-auto max-w-[430px] rounded-xl border border-[#b89b7a]/50 bg-[#f8edda] p-6 font-entry-elegant shadow-sm">
 <Link href={`/calendario/giorno?data=${date}`} className="text-[#792d40]">← Indietro al giorno</Link><h1 className="my-5 text-center text-3xl text-[#792d40]">Modifica lezione</h1>
 {error&&<p role="alert" className="mb-4 text-[#a2273c]">{error}</p>}
 {item&&<form onSubmit={save} className="space-y-4">
 <p className="text-xl">{item.studentNameSnapshot} · {item.subject}</p>
 <label className="block">Data<input type="date" required value={item.date} onChange={e=>setItem({...item,date:e.target.value})} className={field}/></label>
 <label className="block">Ora<input type="time" required step="1800" value={item.startTime} onChange={e=>setItem({...item,startTime:e.target.value})} className={field}/></label>
 <label className="block">Durata in minuti<input type="number" min="15" max="480" step="15" value={item.durationMinutes} onChange={e=>setItem({...item,durationMinutes:Number(e.target.value)})} className={field}/></label>
 <label className="block">Modalità<select value={item.mode} onChange={e=>setItem({...item,mode:e.target.value as LessonMode})} className={field}><option value="casa">Casa</option><option value="domicilio">A domicilio</option><option value="online">Online</option></select></label>
 <label className="block">Stato<select value={item.status} onChange={e=>setItem({...item,status:e.target.value as LessonStatus})} className={field}><option value="confermata">Confermata</option><option value="attesa">In attesa</option><option value="richiesta">Richiesta</option><option value="annullata">Annullata</option></select></label>
 <label className="block">Pagamento<select value={item.paymentStatus} onChange={e=>setItem({...item,paymentStatus:e.target.value as PaymentStatus})} className={field}><option value="non_pagata">Non pagata</option><option value="pagata">Pagata</option><option value="parziale">Parziale</option><option value="non_dovuta">Non dovuta</option></select></label>
 <button type="submit" className="w-full rounded-full bg-[#813247] px-4 py-3 text-[#fff8ed]">Salva modifiche</button>
 </form>}
 </div></main>;
}
