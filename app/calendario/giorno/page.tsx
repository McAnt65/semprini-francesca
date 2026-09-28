"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import CalendarFrame from "../CalendarFrame";
import { addDays, isLocalDate, parseLocalDate, parseLocalTime, toLocalDate } from "../../data/calendario/calendar-dates";
import { selectDayOccurrences } from "../../data/calendario/calendar-selectors";
import { loadCalendarAppointments, loadCalendarSeries } from "../../data/calendario/calendar-storage";
import type { CalendarAppointment, CalendarOccurrence, CalendarSeries, LessonMode } from "../../data/calendario/calendar-types";
const months=["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
const weekdays=["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"];
const modes:Record<LessonMode,string>={casa:"Casa",domicilio:"A domicilio",online:"Online"};
const colors:Record<string,string>={confermata:"#e2ecdd",attesa:"#f4e7c9",richiesta:"#dce9ed",svolta:"#e8e2d0",annullata:"#f0dedd"};
const HALF_HOUR=56, FIRST=480;
export default function DayPage(){return <Suspense fallback={<main className="min-h-dvh bg-[#efe3ce]"/>}><Day/></Suspense>;}
function Day(){
 const router=useRouter(),search=useSearchParams(),today=useMemo(()=>toLocalDate(new Date()),[]);
 const requested=search.get("data"), selected=isLocalDate(requested)?requested:today;
 const [appointments,setAppointments]=useState<CalendarAppointment[]>([]),[series,setSeries]=useState<CalendarSeries[]>([]);
 const scroll=useRef<HTMLDivElement>(null);
 useEffect(()=>{queueMicrotask(()=>{setAppointments(loadCalendarAppointments());setSeries(loadCalendarSeries());});},[]);
 const lessons=useMemo(()=>selectDayOccurrences(appointments,series,selected).sort((a,b)=>a.startTime.localeCompare(b.startTime)),[appointments,series,selected]);
 const active=lessons.filter(item=>item.status!=="annullata");
 const total=active.reduce((n,item)=>n+item.durationMinutes,0);
 const p=parseLocalDate(selected)!; const weekday=new Date(Date.UTC(p.year,p.month-1,p.day)).getUTCDay();
 const title=`${weekdays[weekday]} ${p.day} ${months[p.month-1]} ${p.year}`;
 const firstTime=active[0]?.startTime;
 useEffect(()=>{const parts=parseLocalTime(firstTime);if(scroll.current) scroll.current.scrollTop=parts?Math.max(0,((parts.hour*60+parts.minute-FIRST)/30)*HALF_HOUR-56):0;},[selected,firstTime]);
 const positioned=layout(lessons);
 return <CalendarFrame view="day" date={selected} previous={()=>router.push(`/calendario/giorno?data=${addDays(selected,-1)}`)} next={()=>router.push(`/calendario/giorno?data=${addDays(selected,1)}`)}>
  <h1 aria-live="polite" className={`absolute left-[16%] top-[21.65%] w-[68%] whitespace-nowrap text-center font-entry-elegant text-[clamp(13px,3.8vw,18px)] ${selected===today?"text-[#9e293d]":"text-[#642b36]"}`}>{title}</h1>
  <p className="absolute left-[19%] top-[26.3%] w-[62%] text-center font-entry-elegant text-[clamp(12px,3.4vw,16px)] text-[#6e3b42]">{active.length} {active.length===1?"lezione":"lezioni"} · {total%60?`${Math.floor(total/60)} ore ${total%60} min`:`${total/60} ${total===60?"ora":"ore"}`}</p>
  <section aria-label={`Agenda di ${title}`} ref={scroll} className="absolute left-[4%] top-[31%] z-20 h-[56.1%] w-[92%] overflow-y-auto overscroll-contain scroll-smooth [scrollbar-width:thin] [scrollbar-color:#bca286_transparent]">
   <div className="relative" style={{height:28*HALF_HOUR}}>
    {Array.from({length:28},(_,i)=>{const minutes=FIRST+i*30;const time=`${String(Math.floor(minutes/60)).padStart(2,"0")}:${String(minutes%60).padStart(2,"0")}`;return <Link key={time} href={`/calendario/nuova?data=${selected}&ora=${time}`} aria-label={`Nuova lezione alle ${time}`} className="absolute left-0 w-full border-t border-[#a7896d]/25 focus-visible:outline-[#813247]" style={{top:i*HALF_HOUR,height:HALF_HOUR}}><span className={`pointer-events-none pl-[2%] font-entry-elegant text-[clamp(14px,3.5vw,17px)] ${i%2?"text-[#735842]":"font-semibold text-[#543529]"}`}>{time}</span></Link>;})}
    {positioned.map(({item,start,end,lane,lanes})=>{const id=encodeURIComponent(item.appointmentId??item.occurrenceId);return <Link key={item.occurrenceId} href={`/calendario/${id}/modifica?data=${selected}`} aria-label={`Modifica ${item.studentNameSnapshot} alle ${item.startTime}`} className="absolute z-10 overflow-hidden rounded-[8px] border border-[#846e56]/25 px-[2%] py-1 font-entry-elegant text-[#463126] focus-visible:outline-[#813247]" style={{top:((start-FIRST)/30)*HALF_HOUR+2,height:Math.max(28,((end-start)/30)*HALF_HOUR-4),left:`${24+lane*(75/lanes)}%`,width:`${75/lanes-1}%`,backgroundColor:colors[item.status]}}>
      <span className="block truncate text-[clamp(12px,3.4vw,17px)] font-semibold leading-tight">{item.studentNameSnapshot}</span>
      <span className="block truncate text-[clamp(10px,2.9vw,14px)] leading-tight">{item.startTime} · {item.subject} · {item.durationMinutes} min</span>
      <span className="block truncate text-[clamp(9px,2.6vw,12px)] leading-tight">{modes[item.mode]}{item.status!=="confermata"?` · ${item.status}`:""}</span>
     </Link>;})}
   </div>
  </section>
 </CalendarFrame>;
}
function layout(items:CalendarOccurrence[]){
 const valid=items.map(item=>{const t=parseLocalTime(item.startTime);if(!t)return null;const start=Math.max(FIRST,t.hour*60+t.minute),end=Math.min(1320,t.hour*60+t.minute+item.durationMinutes);return end>start?{item,start,end,lane:0,lanes:1}:null;}).filter((x):x is NonNullable<typeof x>=>x!==null).sort((a,b)=>a.start-b.start);
 let cluster:typeof valid=[];let clusterEnd=0;
 function assign(){const ends:number[]=[];for(const x of cluster){let lane=ends.findIndex(end=>end<=x.start);if(lane<0){lane=ends.length;ends.push(x.end);}else ends[lane]=x.end;x.lane=lane;}for(const x of cluster)x.lanes=ends.length;}
 for(const x of valid){if(cluster.length&&x.start>=clusterEnd){assign();cluster=[];}cluster.push(x);clusterEnd=Math.max(clusterEnd,x.end);}if(cluster.length)assign();return valid;
}
