import { readFileSync } from "node:fs";
import { expect,type Page } from "@playwright/test";
import { pane,drop } from "./learning-helpers";
import type { Draft as MissionDraft } from "../src/lib/missions/contracts";
import type { Draft as TutorialDraft } from "../src/lib/timeline/contracts";

export function tutorialReferences(){return JSON.parse(readFileSync("backend/reference_solutions/tutorials.json","utf8")).flightSchools;}
export function missionReferences(){return JSON.parse(readFileSync("backend/missions/references.json","utf8")).levels as {id:number;reasonableDraft:MissionDraft;reasonable:number;minimumKept:number}[];}

async function gate(page:Page,name:string,key:string,wires:string[]){
  const label=name==="bit_flip"?"Bit flip · X error":name==="phase_flip"?"Phase flip · Z error":name.toUpperCase();
  await drop(page,`Drag ${label}`,`${key}@${wires[0]}`);
  if(wires.length===2)await drop(page,"Drag controlled gate target endpoint",`${key}@${wires[1]}`);
}
export async function placeTutorial(page:Page,d:TutorialDraft){
  await pane(page,"Experiment");
  for(const g of [...d.operations].sort((a,b)=>a.column-b.column))
    await gate(page,g.name,`c${g.column}`,g.qubits.map(q=>q<d.dataQubits?`q${q}`:`a${q-d.dataQubits}`));
}
export async function placeMission(page:Page,d:MissionDraft,n:number,length:number){
  await pane(page,"Experiment");
  for(const [boundary,count] of Object.entries(d.bands)){
    let current=+boundary===0?4:+boundary===length?8:0;
    while(current<count){
      await page.getByLabel("Payload insertion boundary").selectOption(boundary);
      await page.getByRole("button",{name:"Insert columns",exact:true}).click();current+=4;
    }
  }
  for(const g of [...d.operations].sort((a,b)=>a.boundary-b.boundary||a.slot-b.slot))
    await gate(page,g.name,`b${g.boundary}s${g.slot}`,g.qubits.map(q=>q<n?`q${q}`:`a${q-n}`));
  await expect(page.getByRole("button",{name:"Run mission",exact:true})).toBeEnabled();
}
