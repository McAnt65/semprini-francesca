"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatLocalDate, parseLocalDate, toLocalDate } from "../../data/calendario/calendar-dates";
import { selectOccurrencesInRange } from "../../data/calendario/calendar-selectors";
import { createSingleOccurrenceException } from "../../data/calendario/calendar-recurrence";
import { loadCalendarAppointments, loadCalendarSeries, upsertCalendarAppointment } from "../../data/calendario/calendar-storage";
import type { CalendarAppointment, CalendarOccurrence, CalendarSeries, PaymentStatus } from "../../data/calendario/calendar-types";
const months=["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
const euro=(n:number)=>new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(n/100);
const paid=(item:CalendarOccurrence)=>item.paymentStatus==="non_dovuta"?0:Math.min(item.lessonAmountCents,item.paidAmountCents??(item.paymentStatus==="pagata"?item.lessonAmountCents:0));
const due=(item:CalendarOccurrence)=>item.paymentStatus==="non_dovuta"?0:item.lessonAmountCents;
type PaymentView="mese"|"studenti"|"da_saldare"|"saldati";
const views: {id:PaymentView;label:string}[]=[{id:"mese",label:"Mese"},{id:"studenti",label:"Studenti"},{id:"da_saldare",label:"Da saldare"},{id:"saldati",label:"Saldati"}];
const backgrounds:Record<PaymentView,string>={mese:"/payments-month-clean.png",studenti:"/payments-students-clean.png",da_saldare:"/payments-due-clean.png",saldati:"/payments-paid-clean.png"};
export default function PaymentsPage(){
 const router=useRouter(),today=useMemo(()=>toLocalDate(new Date()),[]);const initial=parseLocalDate(today)!;
 const [month,setMonth]=useState({year:initial.year,month:initial.month}),[appointments,setAppointments]=useState<CalendarAppointment[]>([]),[series,setSeries]=useState<CalendarSeries[]>([]),[selected,setSelected]=useState<string|null>(null),[error,setError]=useState("");
 const [view,setView]=useState<PaymentView>("mese");
 const [selectedOccurrence,setSelectedOccurrence]=useState<string|null>(null);
 useEffect(()=>{queueMicrotask(()=>{setAppointments(loadCalendarAppointments());setSeries(loadCalendarSeries());});},[]);
 const from=formatLocalDate({...month,day:1});const last=new Date(Date.UTC(month.year,month.month,0)).getUTCDate();const to=formatLocalDate({...month,day:last});
 const lessons=useMemo(()=>selectOccurrencesInRange(appointments,series,from,to).filter(item=>item.status!=="annullata"),[appointments,series,from,to]);
 const visibleLessons=useMemo(()=>lessons.filter(item=>view==="da_saldare"?due(item)>paid(item):view==="saldati"?due(item)>0&&paid(item)>=due(item):true),[lessons,view]);
 const groups=useMemo(()=>{const map=new Map<string,{name:string;items:CalendarOccurrence[]}>();for(const item of visibleLessons){const group=map.get(item.studentId)??{name:item.studentNameSnapshot,items:[]};group.items.push(item);map.set(item.studentId,group);}return [...map.entries()].sort((a,b)=>a[1].name.localeCompare(b[1].name,"it"));},[visibleLessons]);
 const billed=lessons.reduce((n,x)=>n+due(x),0),collected=lessons.reduce((n,x)=>n+paid(x),0),outstanding=billed-collected;
 function shift(n:number){const date=new Date(Date.UTC(month.year,month.month-1+n,1));setMonth({year:date.getUTCFullYear(),month:date.getUTCMonth()+1});setSelected(null);}
 function update(item:CalendarOccurrence,amount:number,notDue=false){
  const value=Math.max(0,Math.min(item.lessonAmountCents,Math.round(amount*100)));
  const status:PaymentStatus=notDue?"non_dovuta":value===0?"non_pagata":value>=item.lessonAmountCents?"pagata":"parziale";
  const existing=appointments.find(x=>x.id===item.appointmentId);const source=series.find(x=>x.id===item.seriesId);
  const record=existing?{...existing,paidAmountCents:value,paymentStatus:status,updatedAt:new Date().toISOString()}:source?createSingleOccurrenceException(source,item.originalOccurrenceDate??item.date,crypto.randomUUID(),{paidAmountCents:value,paymentStatus:status}):null;
  if(!record||!upsertCalendarAppointment(record)){setError("Non è stato possibile salvare il pagamento.");return;}
  setAppointments(loadCalendarAppointments());setError("");
 }
 return <main className="min-h-dvh overflow-x-hidden bg-[#efe3ce]"><div className="mx-auto w-full max-w-[430px] sm:py-3"><div className="relative aspect-[941/1672] min-h-dvh w-full overflow-hidden sm:min-h-0 sm:rounded-[28px]">
 <Image src={backgrounds[view]} alt="" fill priority unoptimized sizes="(max-width: 430px) 100vw, 430px" className="pointer-events-none object-fill"/>
 <button onClick={()=>router.back()} aria-label="Indietro" className="absolute left-[3%] top-[1%] h-[8%] w-[24%]"/><Link href="/menu" aria-label="Menu" className="absolute right-[3%] top-[1%] h-[9%] w-[17%]"/>
 <Link href="/tariffario" aria-label="Tariffe" className="absolute left-[10%] top-[22.6%] h-[4.6%] w-[40%]"/>
 <nav aria-label="Sottomenu pagamenti" className="absolute left-[17%] top-[30%] z-20 grid h-[4.5%] w-[66%] grid-cols-4">
 {views.map(({id,label})=><button key={id} type="button" aria-label={label} aria-current={view===id?"page":undefined} onClick={()=>{setView(id);setSelected(null);setSelectedOccurrence(null);}} className="relative h-full w-full bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#813247]"><span className="sr-only">{label}</span></button>)}
 </nav>
 <button onClick={()=>shift(-1)} aria-label="Mese precedente" className="absolute left-[17%] top-[35.4%] z-20 h-[5%] w-[13%]"/><button onClick={()=>shift(1)} aria-label="Mese successivo" className="absolute right-[17%] top-[35.4%] z-20 h-[5%] w-[13%]"/>
 <h1 aria-live="polite" className="absolute left-[30%] top-[36.4%] w-[40%] whitespace-nowrap text-center font-entry-elegant text-[clamp(13px,3.7vw,19px)] text-[#6c2d3a]">{months[month.month-1]} {month.year}</h1>
 {view==="mese"&&<div className="absolute left-[8%] top-[46%] grid h-[5.6%] w-[84%] grid-cols-3 gap-[2%] text-center font-entry-elegant text-[#523628]">{[["Conteggiato",billed],["Saldato",collected],["Da saldare",outstanding]].map(([label,value])=><div key={label} className="flex items-center justify-center"><strong className="text-[clamp(11px,3.2vw,16px)] text-[#813247]">{euro(Number(value))}</strong></div>)}</div>}
 <section aria-label={`Pagamenti: ${views.find(x=>x.id===view)?.label}`} className={`absolute left-[7%] ${view==="mese"?"top-[53%] h-[22%]":view==="studenti"?"top-[46%] h-[33%]":view==="saldati"?"top-[48%] h-[26%]":"top-[42%] h-[41%]"} w-[86%] overflow-y-auto px-[2%] font-entry-elegant text-[#4d3327] [scrollbar-width:thin]`}>
 {error&&<p role="alert" className="text-[#a52e42]">{error}</p>}
 {visibleLessons.length===0?<p className="mt-8 text-center italic">{view==="da_saldare"?"Nessuna lezione da saldare":view==="saldati"?"Nessuna lezione saldata":"Nessuna lezione conteggiata in questo mese"}</p>:(view==="da_saldare"||view==="saldati")?visibleLessons.map(item=><div key={item.occurrenceId} className="border-b border-[#9e8164]/40 py-2">
 <button onClick={()=>setSelectedOccurrence(selectedOccurrence===item.occurrenceId?null:item.occurrenceId)} aria-expanded={selectedOccurrence===item.occurrenceId} className="w-full text-left text-[clamp(11px,3vw,15px)]"><span className="block font-semibold text-[#813247]">{item.studentNameSnapshot} · {item.date.slice(8)}/{item.date.slice(5,7)} · {item.subject}</span><span>{euro(due(item))} · {view==="saldati"?"Saldato":`Versato ${euro(paid(item))} · Resta ${euro(due(item)-paid(item))}`}</span></button>
 {selectedOccurrence===item.occurrenceId&&<PaymentRow key={`${item.occurrenceId}:${paid(item)}:${item.paymentStatus}`} item={item} onSave={update}/>}
 </div>):groups.map(([id,group])=>{const key=selected===id;return <div key={id} className="border-b border-[#9e8164]/40 py-2">
 <button onClick={()=>setSelected(key?null:id)} aria-expanded={key} className="w-full text-left">{view==="studenti"?<span className="grid grid-cols-[1.4fr_1fr_1fr] items-center gap-1 text-[clamp(11px,3vw,15px)]"><span className="truncate text-[#813247]">{group.name}<small className="block text-[#6d5040]">{group.items.length} {group.items.length===1?"lezione":"lezioni"}</small></span><span className="text-center">{euro(group.items.reduce((n,x)=>n+due(x),0))}</span><span className="text-center">{euro(group.items.reduce((n,x)=>n+paid(x),0))}</span></span>:<><span className="block text-[clamp(14px,3.8vw,18px)] text-[#813247]">{group.name} · {group.items.length} {group.items.length===1?"lezione":"lezioni"}</span><span className="text-[clamp(11px,3vw,14px)]">Conteggiato {euro(group.items.reduce((n,x)=>n+due(x),0))} · Saldato {euro(group.items.reduce((n,x)=>n+paid(x),0))}</span></>}</button>
 {key&&group.items.map(item=><PaymentRow key={`${item.occurrenceId}:${paid(item)}:${item.paymentStatus}`} item={item} onSave={update}/>)}
 </div>;})}
 </section>
 <nav aria-label="Navigazione principale" className="absolute inset-x-[2%] bottom-[1%] h-[10%]">{[["/studenti","Studenti"],["/calendario","Calendario"],["/calendario/nuova","Lezione"],["/materie","Materie"],["/menu","Menu"]].map(([href,label],i)=><Link key={label} href={href} aria-label={label} className="absolute inset-y-0 w-[20%]" style={{left:`${i*20}%`}}/>)}</nav>
 </div></div></main>;
}
function PaymentRow({item,onSave}:{item:CalendarOccurrence;onSave:(item:CalendarOccurrence,amount:number,notDue?:boolean)=>void}){
 const [amount,setAmount]=useState(String((paid(item)/100).toFixed(2)));
 return <div className="mt-2 rounded-md bg-[#fff9ed]/65 p-2 text-[clamp(11px,3vw,14px)]"><p>{item.date.slice(8)} · {item.subject} · {euro(item.lessonAmountCents)} {item.tariffCode?`· ${item.tariffCode}`:""}</p>
 <div className="mt-1 flex items-center gap-2"><label className="min-w-0 flex-1">Versato (€)<input aria-label={`Versato per ${item.studentNameSnapshot} il ${item.date}`} type="number" min="0" max={item.lessonAmountCents/100} step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} className="ml-1 w-[62px] rounded bg-[#fff8e9] px-1"/></label><button onClick={()=>onSave(item,Number(amount))} className="rounded-full bg-[#813247] px-3 py-1 text-white">Salva</button></div>
 <button onClick={()=>onSave(item,0,item.paymentStatus!=="non_dovuta")} className="mt-1 text-[#813247] underline">{item.paymentStatus==="non_dovuta"?"Ripristina importo":"Non dovuta"}</button></div>;
}
