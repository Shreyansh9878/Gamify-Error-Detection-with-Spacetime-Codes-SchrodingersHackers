from pathlib import Path
import re
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT

sections = [
('0:00 - 0:30', 'The idea', 'Show the main menu, then start the game.',
"Hi everyone. We're Schrodinger's Hackers, and this is Quantum Shield. Our game asks a simple question: how do you protect a quantum circuit without making things worse? Every check adds work, and that extra work can introduce noise. Players explore this trade-off by placing checks and seeing results computed in Qiskit."),
('0:30 - 1:05', 'What the player learns', 'Show FS1 noise comparison, then FS2 method comparison.',
"We start with bit flips, phase flips, and decoherence, so players can see what noise does to a quantum state. Then we explain three different approaches. Detection flags some faulty runs and discards them. Mitigation improves an estimate using extra experiments and processing. Correction uses redundant encoding to recover from errors. Our game focuses on detection. It filters runs; it doesn't repair them."),
('1:05 - 1:50', 'How a check works', 'In FS3, compare the wrong closure with the correct Y closure. Then add an X fault after S.',
"Here's how a spacetime check works. A helper qubit opens a check before part of the computation and closes it afterward. The closing check has to match how the circuit transforms the opening check. In this example, the S gate turns X into Y, so we need a Y check at the end. The wrong choice turns the connection red. With the correct choice, this X error flips the helper's measurement result, called the syndrome, and we discard the flagged run. A green connection means the check closes correctly. It doesn't mean every possible error will be caught."),
('1:50 - 2:30', 'Placement and scoring', 'Show Main 1 placement, Main 4 automatic closure, and the FS6 shot-budget bar.',
"In the main missions, the computation stays fixed. Players choose where to place checks using a limited number of helper qubits. From mission four onward, the game generates the closing check automatically. Our score is called Trusted Fidelity. It measures how close the retained output is to the ideal state, with a penalty if too few runs survive. We always show fidelity alongside the fraction of runs kept. These values come from full-state simulation."),
('2:30 - 3:25', 'T gates and the experiment', 'Show FS5: X across T fails, Z across T works. Switch to the matched-study figure.',
"T gates make this harder. Across a T gate, X becomes a combination of Pauli operators, while Z stays unchanged. Our checks therefore allow only identity or Z at that crossing. We compared circuits with the same three-wire structure and uniform noise. At one repetition, increasing the T count from zero to four reduced the valid checked candidates from seven to zero. In a deeper case, one check improved fidelity from about seventy-two to seventy-six percent, but kept only about seventy-nine percent of runs. Multiplying fidelity by retention gave a yield of about sixty percent. The unchecked circuit did better on yield. So higher fidelity alone doesn't guarantee a better result."),
('3:25 - 4:05', 'When targeted protection helps', 'Show the FS6 comparison and Main 10 results. Keep test counts visible without reading them aloud.',
"Placement can still make a big difference. In mission ten's synthetic noise hotspot, the baseline score is about zero point three seven. Blanket checking lowers it to zero point two seven, while a targeted placement reaches zero point seven three, above the target of zero point six seven. The lesson is to protect the vulnerable part of the circuit. Our T-gate search is custom and bounded. We report Paulice's native Clifford results separately. We've also checked the implementation with backend, frontend, browser, and live API tests."),
('4:05 - 4:40', 'Limits and closing', 'Show the repository, report, reproduction commands, and live game link.',
"Our team defined the learning goals, game direction, and acceptance criteria. AI tools helped implement the physics, search, interface, tests, notebooks, and presentation materials. The noise is synthetic, simulations are limited to seven wires, and the best strategy we found isn't guaranteed to be the global best. The code, report, and reproduction steps are in our repository. Quantum Shield turns a technical trade-off into a decision players can test: where is a check worth its cost? Thank you."),
]

out = Path('output/pdf/presentation_script_revised.pdf')
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='TitleCustom', fontName='Helvetica-Bold', fontSize=23, leading=28, textColor=colors.HexColor('#142D4E'), spaceAfter=10))
styles.add(ParagraphStyle(name='SectionCustom', fontName='Helvetica-Bold', fontSize=14, leading=19, textColor=colors.HexColor('#142D4E'), spaceAfter=8))
styles.add(ParagraphStyle(name='CueCustom', fontName='Helvetica-Oblique', fontSize=10, leading=14, textColor=colors.HexColor('#52657A'), spaceAfter=12))
styles.add(ParagraphStyle(name='SpokenCustom', fontName='Helvetica', fontSize=12, leading=19, spaceAfter=15))
words = sum(len(re.findall(r"\b[\w]+(?:['-][\w]+)*\b", s[3])) for s in sections)
story=[]
for page in range(4):
    if page: story.append(PageBreak())
    if page == 0:
        story += [Paragraph('Quantum Shield', styles['TitleCustom']), Paragraph('Word-for-word presentation script', styles['SectionCustom']), Paragraph(f"Five-minute working limit | {words} spoken words | Finish target: 4:40", styles['CueCustom']), Paragraph('Read only the spoken paragraphs. Screen cues and headings are not spoken. The timing allows short pauses and transitions at roughly 140 words per minute. Rehearse once with a timer; actual delivery speed will vary. The five-minute target comes from the original script.', styles['CueCustom']), Spacer(1,10)]
    indices = [[0,1],[2,3],[4],[5,6]][page]
    for i in indices:
        time,title,cue,speech=sections[i]
        story += [Paragraph(f'{time}  |  {title}', styles['SectionCustom']), Paragraph('SCREEN: '+cue, styles['CueCustom']), Paragraph(speech, styles['SpokenCustom'])]
    if page == 3:
        story += [Spacer(1,10), Paragraph('Rehearsal notes - not spoken',styles['SectionCustom']), Paragraph('Say X, Y, Z, S, and T as letter names. Say Qiskit as "kiss-kit". Keep the results on screen while speaking the rounded numbers. Use the final 20 seconds as a buffer for slower delivery or transitions. This is a timed recording script, not a live exploration: prepare each screen beforehand.',styles['CueCustom'])]

def footer(canvas, doc):
    canvas.setStrokeColor(colors.HexColor('#D9E1EA')); canvas.line(46,42,549,42)
    canvas.setFont('Helvetica',9); canvas.setFillColor(colors.HexColor('#52657A'))
    canvas.drawString(46,28,"Schrodinger's Hackers | Speaking copy")
    canvas.drawRightString(549,28,str(doc.page))

SimpleDocTemplate(str(out),pagesize=(595,842),rightMargin=46,leftMargin=46,topMargin=42,bottomMargin=57).build(story,onFirstPage=footer,onLaterPages=footer)
md=['# Quantum Shield - word-for-word presentation script',f'\nFive-minute working limit. {words} spoken words. Finish target: 4:40.\n','Read only the spoken paragraphs. Timing assumes roughly 140 words per minute with pauses and screen changes. Rehearse with a timer; the five-minute target comes from the original script.\n']
for time,title,cue,speech in sections:
    md += [f'## {time} | {title}\n',f'*Screen cue - do not read: {cue}*\n',speech+'\n']
Path('docs/submission/presentation_script_revised.md').write_text('\n'.join(md),encoding='utf-8')
print(f'{words} spoken words; {words/140:.2f} minutes at 140 wpm')
