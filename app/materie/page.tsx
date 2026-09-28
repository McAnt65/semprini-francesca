import MaterieFrame, { Hotspot } from "./MaterieFrame";

export default function MateriePage() {
  return <MaterieFrame image="/materie-watercolor.png" alt="Le mie materie: Matematica, Fisica e Chimica">
    <Hotspot href="/materie/matematica" label="Apri Matematica" x={16} y={22} w={23} h={49} />
    <Hotspot href="/materie/fisica" label="Apri Fisica" x={40} y={22} w={20} h={49} />
    <Hotspot href="/materie/chimica" label="Apri Chimica" x={61} y={22} w={23} h={49} />
  </MaterieFrame>;
}
