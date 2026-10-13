"""
scoring.py -- Game scoring and leaderboard for Quantum Shield.

Score formula:
  Score = F_post x f_kept x 1000

This formula is NOT hand-set.  It is computed directly from live Qiskit Aer
simulation results:
  - F_post: post-selected fidelity (shots with trivial syndrome)
  - f_kept: fraction of shots not discarded

Design rationale:
  Both F_post and f_kept must be high to get a high score.  A strategy that
  achieves F_post=1.0 by discarding 99% of shots scores only 10 points.
  A strategy with F_post=0.9 and f_kept=0.9 scores 810 points.
  This directly reflects the hackathon's stated objective: find the best
  trade-off between post-selected fidelity and kept-shot fraction.

Grade thresholds:
  >= 800 : Quantum Guardian  (excellent trade-off)
  >= 600 : Error Warden      (good trade-off)
  >= 400 : Syndrome Scout    (moderate -- too few checks or too many)
  >= 200 : Qubit Cadet       (poor strategy)
  <  200: Decoherence Victim (insufficient error detection)
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional
import time


@dataclass
class ScoreEntry:
    """A single scored game attempt."""
    level: int
    label: str
    score: float
    f_post: float
    f_kept: float
    f_no_checks: float
    n_check_qubits: int
    n_2q_added: int
    t_count: int
    timestamp: float = field(default_factory=time.time)

    @property
    def grade(self) -> str:
        if self.score >= 800:
            return "[**] Quantum Guardian"
        elif self.score >= 600:
            return "[S]  Error Warden"
        elif self.score >= 400:
            return "[~]  Syndrome Scout"
        elif self.score >= 200:
            return "[>]  Qubit Cadet"
        else:
            return "[X]  Decoherence Victim"

    @property
    def fidelity_improvement(self) -> float:
        """How much did post-selection improve fidelity over baseline?"""
        if self.f_no_checks < 1e-9:
            return 0.0
        return (self.f_post - self.f_no_checks) / self.f_no_checks * 100

    def to_row(self) -> list:
        """Return a list of strings for tabular display."""
        return [
            str(self.level),
            self.label[:30],
            f"{self.score:.1f}",
            f"{self.f_post:.4f}",
            f"{self.f_kept:.4f}",
            f"{self.f_no_checks:.4f}",
            f"{self.fidelity_improvement:+.1f}%",
            str(self.n_check_qubits),
            str(self.n_2q_added),
            str(self.t_count),
            self.grade,
        ]

    @property
    def row_headers(self) -> list[str]:
        return [
            "Lvl", "Label", "Score", "F_post", "f_kept",
            "F_base", "dF%", "#anc", "+2Q", "T", "Grade"
        ]


class Leaderboard:
    """Track scores across game sessions."""

    def __init__(self):
        self.entries: list[ScoreEntry] = []

    def add(self, entry: ScoreEntry):
        self.entries.append(entry)

    def best_score(self) -> Optional[float]:
        if not self.entries:
            return None
        return max(e.score for e in self.entries)

    def best_per_level(self) -> dict[int, ScoreEntry]:
        best: dict[int, ScoreEntry] = {}
        for e in self.entries:
            if e.level not in best or e.score > best[e.level].score:
                best[e.level] = e
        return best

    def sorted_entries(self) -> list[ScoreEntry]:
        return sorted(self.entries, key=lambda e: e.score, reverse=True)

    def total_score(self) -> float:
        """Sum of best scores per level (final competition metric)."""
        return sum(e.score for e in self.best_per_level().values())

    def summary_lines(self) -> list[str]:
        lines = [
            "-" * 60,
            f"  QUANTUM SHIELD LEADERBOARD  (total score: {self.total_score():.1f})",
            "-" * 60,
        ]
        for e in self.sorted_entries():
            lines.append(
                f"  Lvl {e.level:1d}  {e.label[:22]:<22s}  "
                f"Score={e.score:6.1f}  "
                f"F_post={e.f_post:.3f}  "
                f"f_kept={e.f_kept:.3f}  "
                f"{e.grade}"
            )
        lines.append("-" * 60)
        return lines


def compute_score(f_post: float, f_kept: float) -> float:
    """
    Compute the game score from quantum simulation metrics.

    Score = F_post x f_kept x 1000

    Args:
        f_post: Post-selected fidelity in [0, 1].
        f_kept: Fraction of shots kept after post-selection, in [0, 1].

    Returns:
        Float in [0, 1000].
    """
    return float(f_post) * float(f_kept) * 1000.0


GRADE_THRESHOLDS = [
    (800, "[**] Quantum Guardian"),
    (600, "[S]  Error Warden"),
    (400, "[~]  Syndrome Scout"),
    (200, "[>]  Qubit Cadet"),
    (0,   "[X]  Decoherence Victim"),
]


def grade(score: float) -> str:
    for threshold, name in GRADE_THRESHOLDS:
        if score >= threshold:
            return name
    return "?  Decoherence Victim"
