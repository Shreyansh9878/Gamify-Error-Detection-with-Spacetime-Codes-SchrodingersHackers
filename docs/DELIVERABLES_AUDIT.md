# Advanced-track deliverables audit

Source: complete five-page “Qiskit Fall Fest 2026 Hackathon — Advanced Track” brief supplied by the owner. SHA256: 81d9e22329453f1330530924dbf057a0495194c067e77ff37967fba88b02f7d2. Organizer clarification reported by the owner: participant-selected noise is permitted; disclose the model. This checklist distinguishes implementation evidence from public submission actions. Judging scores are awarded by judges, not self-certified here.

| Brief requirement / criterion | Status | Evidence or remaining action |
|---|---|---|
| Playable error-detection game with Qiskit-computed numeric feedback | Met | Six Flight Schools and ten missions; backend timeline/missions engines; full-progression Playwright journey |
| Explain quantum errors and the fragility of quantum information | Met | FS1 preparation/noise/state experiments, Bloch/QSphere and counts |
| Distinguish detection, mitigation and correction and their overhead | Met | FS2 freely ordered method comparison; SCIENTIFIC_REPORT educational scope |
| Explain stabilizers, syndromes, surface/qLDPC ideas and fault tolerance | Met | FS3/4 signed propagation and syndromes; report's educational scope distinguishes codes from this game |
| Expose payload, controlled Pauli checks, helper measurement and postselection | Met | Continuous canvas, immutable mission payloads, dynamic validity connectors, exact accepted block |
| Correct spacetime invariants and restricted T crossings | Met | Complete noiseless input-isometry validation; T scorer tests reject X/Y at T before scoring |
| Local free Qiskit/Aer; no required hardware account or paid execution | Met | README setup; exact Aer engines; no Runtime execution |
| Use qiskit-paulice as intended on Clifford inputs | Met | verify_paulice.py reruns FS6/Main1–7 under helper limits; research.py inserts actual checks with native postselection; test_research.py |
| Do not apply Paulice to T circuits | Met | Custom T search and exact simulator; explicit wrapper guard/core tests; separate labeled benchmark |
| Clifford payload plus matched T-doped family, width/depth stated | Met | run_track_experiments.py: same three-data-wire backbone, repetitions 1/3, fixed four doping slots, T=0/1/2/4; TRACK_EXPERIMENTS.json |
| Ideal Clifford stabilizer reference and small-T statevector reference | Met | Core scoring ideal_reference; tests compare both references on Clifford workloads |
| Define fidelity with justification | Met | Phase-sensitive pure-state overlap and normalized accepted density block; report equations |
| Vary number/location/order of checks | Met | Main reachable-window enumeration; matched Z/I shells; actual Paulice one/two-target and order experiments |
| Disclosed comparable synthetic noise | Met | SCIENTIFIC_REPORT exact parameters and distinct protocols; experiment JSON; organizer clarification above |
| Record unchecked/postselected fidelity, kept yield and resource overhead for every configuration | Met | references.json per-strategy metrics; TRACK_EXPERIMENTS rows and separate observable benchmarks; notebook |
| Compare T count, depth, check placement and fidelity/yield trade-off | Met | Executable notebook, matched experiment, mission references, written interpretation including negative results |
| Never present research conditional fidelity without retained fraction | Met | Paired report/JSON/notebook metrics; compact main UI shows Trusted Fidelity, kept-shot fidelity and retained fraction with the shot budget |
| Reproducible runnable code and dependencies | Met | requirements.lock.txt, pnpm-lock.yaml, setup commands, seeded counts and exact score repeats |
| Reproducible notebook (Qiskit judging quality) | Met | notebooks/track_experiments.ipynb; execute_track_notebook.py executes real outputs |
| Written report | Met | SCIENTIFIC_REPORT.md, LEVEL_VALIDATION.md, generated physics certificates |
| Recorded video walkthrough | Missing | Owner must record/upload a real video; complete timing/narration plan in DEMO_SCRIPT.md |
| One public GitHub repository containing code, report and video access | Partially met | All local code/report/demo plan ready; owner must verify public visibility and add actual recording link |
| Submit only repository link by event process | Missing | Owner must submit final public repository URL; local implementation cannot establish submission acceptance |
| Presentation (40%; 4×0–10) | Partially met | Report and five-minute narrative ready; recording/delivery and judges' assessment pending |
| Effect (30%; 3×0–10) | Met | Numeric conditional-fidelity/retention/resource trade-offs, localized-versus-uniform noise comparison, honest bounded optimum |
| Methods (20%; 2×0–10) | Met | Quantum check mechanic, exact scores, signed identities, independently crosschecked density evolution |
| Qiskit (10%; 1×0–10) | Met | Qiskit2 APIs, Aer, actual Paulice calls, pinned versions and executable notebook |

External event website/code-of-conduct and any separate submission/AI-use rules require owner review. The linked event site could not be fetched during this audit; no additional rules have been invented. Slides are not a separate stated deliverable in the supplied brief. PROVENANCE.md discloses AI assistance without asserting unverified human authorship. Implementation-level “Met” means evidence exists; it does not promise a judging score or eligibility approval.

Known scientific limit: the game table reports a finite-family best found. The actual native Paulice gamma suggestion is reported separately because its measurement-parity/observable objective is not interchangeable with the game's budgeted Trusted Fidelity score. T optima are custom-search results. A global optimum over arbitrary circuits is not claimed.
