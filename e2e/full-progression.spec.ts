import {test,expect} from "@playwright/test";
import {pane,drop,runProtection,runCheck,passCheckQuiz} from "./learning-helpers";
import {tutorialReferences,missionReferences,placeTutorial,placeMission} from "./reference-handlers";

test("stored references complete Flight Schools 1–6 then Main 1–10 by real drag/drop and ordered unlocks",async({page})=>{
 test.setTimeout(240000);
 const tutorials=tutorialReferences();await page.goto("/");await pane(page,"Experiment");
 await drop(page,"Drag Bit flip · X error","g0@q0");
 await page.getByRole("button",{name:"Run experiment",exact:true}).click();await pane(page,"Results");
 await expect(page.getByText("✓ Qiskit result",{exact:true})).toBeVisible();await pane(page,"Theory");
 await page.getByRole("button",{name:"Knowledge Check",exact:true}).click();
 for(const answer of ["B. Always 1.","C. Their immediate Z probabilities match, but X measurement distinguishes them.","A. P(1) decreases and P(0) increases."])await page.getByLabel(answer,{exact:true}).check();
 await page.getByRole("button",{name:"Check answers",exact:true}).click();
 await page.getByRole("button",{name:"Continue to Flight School 2 →",exact:true}).click();
 for(const name of ["Detection","Mitigation","Correction"]){await pane(page,"Experiment");await page.getByRole("button",{name,exact:true}).click();await runProtection(page);}
 await pane(page,"Theory");await page.getByRole("button",{name:"Continue to Flight School 3 →",exact:true}).click();
 await placeTutorial(page,tutorials[2].draft);await runCheck(page);await passCheckQuiz(page);
 await page.getByRole("button",{name:"Continue to next Flight School →",exact:true}).first().click();
 for(const number of [4,5]){
  await placeTutorial(page,tutorials[number-1].draft);await runCheck(page);await pane(page,"Theory");
  await page.getByRole("button",{name:"Knowledge Check",exact:true}).click();
  for(const answer of number===4?["X on both wires","X0 X1"]:["Z"])await page.getByLabel(answer,{exact:true}).check();
  await page.getByRole("button",{name:"Continue to next Flight School →",exact:true}).first().click();
 }
 await placeTutorial(page,tutorials[5].draft);await runCheck(page);
 await expect(page.getByRole("region",{name:"Qualification comparison"})).toBeVisible({timeout:60000});
 await page.getByRole("button",{name:"I reviewed the comparison",exact:true}).click();
 await page.getByRole("button",{name:"Start Main Mission 1",exact:true}).last().click();
 await expect(page.locator(".mission-card").nth(1)).toBeDisabled();
 const levels=await(await page.request.get("/api/levels")).json();
 for(const row of missionReferences()){
  const index=row.id-1;
  await expect(page.locator(".mission-card").nth(index)).toBeEnabled();
  await page.locator(".mission-card").nth(index).click();
  await placeMission(page,row.reasonableDraft,levels[index].qubits,levels[index].payload.length);
  await page.getByRole("button",{name:"Run mission",exact:true}).click();await pane(page,"Results");
  await expect(page.getByText("PASS",{exact:true})).toBeVisible();
  await expect(page.getByTestId("combined-score")).toHaveText(row.reasonable.toFixed(4));
  await page.getByRole("button",{name:"Mission control",exact:true}).click();
  if(row.id<10)await expect(page.locator(".mission-card").nth(index+1)).toBeEnabled();
  if(row.id<9)await expect(page.locator(".mission-card").nth(index+2)).toBeDisabled();
 }
 await page.reload();await expect(page.getByText("Expedition complete",{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("quantum-shield-qed-v2")!).tutorial)).toBe("complete");
});
