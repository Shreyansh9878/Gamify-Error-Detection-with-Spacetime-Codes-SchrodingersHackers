"""
ui_terminal.py -- Rich terminal UI for Quantum Shield: The Spacetime Defender.

Uses the `rich` library for:
  - Coloured panels and banners
  - Interactive tables (comparison across check configurations)
  - Progress spinners during Qiskit simulation
  - Circuit ASCII diagrams
  - Leaderboard display
"""

from __future__ import annotations
import sys
import time
from typing import Optional

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich.prompt import Prompt, IntPrompt, Confirm
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn
from rich.columns import Columns
from rich.rule import Rule
from rich.syntax import Syntax
from rich import box

from game.game_engine import GameEngine, SimResult
from game.levels import LEVELS, get_level
from quantum_engine.scoring import grade, GRADE_THRESHOLDS

console = Console()

# -----------------------------------------------------------------------------
# Colours & styles
# -----------------------------------------------------------------------------

THEME = {
    "title":    "bold cyan",
    "subtitle": "dim cyan",
    "good":     "green",
    "warn":     "yellow",
    "bad":      "red",
    "info":     "blue",
    "accent":   "magenta",
    "dim":      "dim",
}


# -----------------------------------------------------------------------------
# Banner
# -----------------------------------------------------------------------------

def print_banner():
    banner = r"""
  ######  ##    ##  #####  ###    ## ######## ##    ## ###    ###
 ##    ## ##    ## ##   ## ####   ##    ##    ##    ## ####  ####
 ##    ## ##    ## ####### ## ##  ##    ##    ##    ## ## #### ##
 ## == ## ##    ## ##   ## ##  ## ##    ##    ##    ## ##  ##  ##
  ######   ######  ##   ## ##   ####    ##     ######  ##      ##
     ==
  ####### ##   ## ## ####### ##      ######
  ##      ##   ## ## ##      ##      ##   ##
  ####### ####### ## #####   ##      ##   ##
       ## ##   ## ## ##      ##      ##   ##
  ####### ##   ## ## ####### ####### ######
    """
    console.print(Panel(
        Text(banner, style="bold cyan", justify="center"),
        title="[bold magenta][*]  THE SPACETIME DEFENDER  [*][/bold magenta]",
        subtitle="[dim]Qiskit Fall Fest 2026 | Schrodinger's Hackers[/dim]",
        border_style="cyan",
        padding=(0, 2),
    ))
    console.print(
        "[dim]  Score = F_post x f_kept x 1000  "
        "(live Qiskit Aer simulation -- never hand-set)[/dim]",
        justify="center",
    )
    console.print()


# -----------------------------------------------------------------------------
# Physics primer panel
# -----------------------------------------------------------------------------

def print_physics_primer():
    text = (
        "[bold]What are Spacetime Pauli Checks?[/bold]\n\n"
        "A [cyan]spacetime check[/cyan] adds one ancilla qubit that entangles with your "
        "payload circuit at [bold]two moments in time[/bold].  If a Pauli error (X, Y, or Z) "
        "occurs between those two moments, the ancilla 'clicks' -- its measurement bit becomes 1.\n\n"
        "[bold]Post-selection:[/bold] shots where any check bit = 1 are discarded.  "
        "The remaining shots are cleaner (higher fidelity).\n\n"
        "[bold]The trade-off:[/bold]\n"
        "  * More checks -> higher [green]F_post[/green] (better fidelity per kept shot)\n"
        "  * More checks -> lower  [yellow]f_kept[/yellow] (fewer shots survive)\n"
        "  * [bold magenta]Score = F_post x f_kept x 1000[/bold magenta]  captures both\n\n"
        "[bold]T gates (Rz(pi/4)):[/bold] These are [red]NOT Clifford gates[/red].  "
        "qiskit-paulice rejects circuits with T gates.  A check spanning a T gate is valid "
        "[bold]only if the Pauli is I or Z[/bold] on that qubit (T is diagonal; it commutes with Z).\n\n"
        "[dim]Reference: Martiel & Javadi-Abhari, arXiv:2504.15725[/dim]"
    )
    console.print(Panel(
        text,
        title="[bold blue][GUIDE]  Physics Primer[/bold blue]",
        border_style="blue",
        padding=(1, 2),
    ))
    console.print()


# -----------------------------------------------------------------------------
# Level selection screen
# -----------------------------------------------------------------------------

def print_level_select():
    table = Table(
        title="[bold cyan]Level Select[/bold cyan]",
        box=box.ROUNDED,
        border_style="cyan",
        show_header=True,
        header_style="bold",
    )
    table.add_column("#", style="bold magenta", width=3, justify="center")
    table.add_column("Title", style="cyan", width=28)
    table.add_column("Circuit", style="white", width=22)
    table.add_column("T", style="yellow", width=3, justify="center")
    table.add_column("Budget", style="green", width=7, justify="center")
    table.add_column("Method", style="blue", width=18)
    table.add_column("Difficulty", style="red", width=12)

    for lvl in LEVELS:
        pc = lvl.payload_factory()
        method = "qiskit-paulice" if lvl.use_auto_checks else "hand-made"
        diff_color = {
            "Tutorial": "green", "Easy": "green", "Medium": "yellow",
            "Hard": "red", "Expert": "red bold", "Master": "magenta bold",
        }.get(lvl.difficulty, "white")
        table.add_row(
            str(lvl.number),
            lvl.title,
            pc.name,
            str(pc.t_count),
            str(lvl.ancilla_budget),
            method,
            f"[{diff_color}]{lvl.difficulty}[/{diff_color}]",
        )
    console.print(table)
    console.print()


# -----------------------------------------------------------------------------
# In-level display
# -----------------------------------------------------------------------------

def print_level_header(level_number: int):
    level = get_level(level_number)
    pc = level.payload_factory()
    console.print(Rule(
        f"[bold cyan]LEVEL {level.number}: {level.title.upper()}  "
        f"[dim]({level.difficulty})[/dim][/bold cyan]",
        style="cyan",
    ))
    console.print()
    console.print(Panel(
        f"[bold]Circuit:[/bold] {pc.name}  |  "
        f"[bold]{pc.n_qubits} qubits[/bold]  |  "
        f"[bold]T-count: {pc.t_count}[/bold]  |  "
        f"Depth ~= {pc.circuit.depth()}\n\n"
        f"[bold yellow]Ancilla budget:[/bold yellow] {level.ancilla_budget} qubit(s)\n"
        f"[bold blue]Check method:[/bold blue] "
        + ("[green]qiskit-paulice (automated)[/green]" if level.use_auto_checks
           else "[red]hand-made (T gates present)[/red]"),
        title=f"[magenta]Circuit Info[/magenta]",
        border_style="magenta",
    ))
    console.print()
    console.print(Panel(
        f"[italic]{level.physics_hint}[/italic]",
        title="[blue][*]  Physics[/blue]",
        border_style="blue",
    ))
    console.print()
    console.print(Panel(
        f"[yellow]{level.strategy_tip}[/yellow]",
        title="[yellow][TIP]  Strategy Tip[/yellow]",
        border_style="yellow",
    ))
    console.print()


def print_circuit(circuit, title: str = "Circuit"):
    """Draw a text diagram of the circuit using Qiskit's built-in drawer."""
    diagram = circuit.draw(output="text", fold=-1).single_string()
    console.print(Panel(
        Syntax(diagram, "text", theme="monokai"),
        title=f"[dim]{title}[/dim]",
        border_style="dim",
        padding=(0, 1),
    ))
    console.print()


def get_player_choices(level_number: int) -> tuple[list[int], int]:
    """
    Interactively ask the player which qubits to target and how many checks.
    Returns (target_qubits, n_checks).
    """
    level = get_level(level_number)
    pc = level.payload_factory()
    max_q = pc.n_qubits - 1

    console.print(
        f"[bold]Available payload qubits:[/bold] 0 to {max_q}\n"
        f"[bold]Ancilla budget:[/bold] {level.ancilla_budget} check(s)"
    )
    console.print(
        f"[dim]Suggested starting target: {level.default_target_qubits}[/dim]"
    )
    console.print()

    while True:
        raw = Prompt.ask(
            "[bold cyan]Enter target qubit indices[/bold cyan] (space-separated)",
            default=" ".join(str(q) for q in level.default_target_qubits),
        )
        try:
            qubits = [int(x) for x in raw.split()]
            invalid = [q for q in qubits if not (0 <= q <= max_q)]
            if invalid:
                console.print(f"[red]Invalid qubit indices: {invalid}. Try again.[/red]")
                continue
            if not qubits:
                console.print("[red]You must select at least one qubit.[/red]")
                continue
            break
        except ValueError:
            console.print("[red]Please enter integers separated by spaces.[/red]")

    max_checks = min(level.ancilla_budget, len(qubits))
    n_checks = IntPrompt.ask(
        f"[bold cyan]How many checks to place?[/bold cyan] (0 to {max_checks})",
        default=min(1, max_checks),
    )
    n_checks = max(0, min(n_checks, max_checks))

    return qubits, n_checks


# -----------------------------------------------------------------------------
# Result display
# -----------------------------------------------------------------------------

def print_result(result: SimResult, level_number: int):
    """Display simulation result with a full metrics panel."""
    if result.error:
        console.print(Panel(
            f"[red bold]Simulation Error:[/red bold]\n{result.error}",
            title="[red][X]  Error[/red]",
            border_style="red",
        ))
        return

    score = result.score
    g = grade(score)

    # Score color
    score_color = (
        "green bold" if score >= 800 else
        "yellow bold" if score >= 600 else
        "red" if score < 400 else "white"
    )

    # Metrics table
    metrics = Table(box=box.SIMPLE, show_header=False, padding=(0, 2))
    metrics.add_column("Metric", style="dim", width=30)
    metrics.add_column("Value", style="bold")

    fidelity_delta = result.fidelity_post_selected - result.fidelity_no_checks
    delta_str = (
        f"[green]+{fidelity_delta:.4f}[/green]" if fidelity_delta >= 0
        else f"[red]{fidelity_delta:.4f}[/red]"
    )

    metrics.add_row("Baseline Fidelity (no checks)", f"{result.fidelity_no_checks:.4f}")
    metrics.add_row("Post-selected Fidelity  (F_post)", f"[green]{result.fidelity_post_selected:.4f}[/green]")
    metrics.add_row("Fidelity improvement", delta_str)
    metrics.add_row("Kept-shot fraction  (f_kept)", f"[yellow]{result.f_kept:.4f}[/yellow]")
    metrics.add_row(
        "Shots (total -> kept)",
        f"{result.n_shots_total:,} -> [yellow]{result.n_shots_kept:,}[/yellow]"
    )
    metrics.add_row("Check ancilla qubits", str(result.n_check_qubits))
    metrics.add_row("Extra 2-qubit gates", str(result.n_2q_gates_added))
    metrics.add_row("Circuit depth (orig -> checked)", f"{result.circuit_depth_original} -> {result.circuit_depth_checked}")
    if result.cost_metric is not None:
        metrics.add_row("Gamma cost (lower=better)", f"{result.cost_metric:.6f}")
    if result.uncovered_pauli_count >= 0:
        color = "red" if result.uncovered_pauli_count > 5 else "yellow" if result.uncovered_pauli_count > 0 else "green"
        metrics.add_row("Uncovered Pauli locations", f"[{color}]{result.uncovered_pauli_count}[/{color}]")

    console.print(Panel(
        metrics,
        title=f"[bold cyan]Simulation Results -- {result.label}[/bold cyan]",
        border_style="cyan",
        padding=(1, 2),
    ))

    # Score box
    console.print(Panel(
        f"[{score_color}]{score:.1f}[/{score_color}]  |  {g}\n\n"
        f"[dim]Score = F_post x f_kept x 1000 = "
        f"{result.fidelity_post_selected:.4f} x {result.f_kept:.4f} x 1000[/dim]",
        title="[bold magenta][TROPHY]  GAME SCORE[/bold magenta]",
        border_style="magenta",
        padding=(1, 4),
    ))
    console.print()


# -----------------------------------------------------------------------------
# Comparison table
# -----------------------------------------------------------------------------

def print_comparison_table(results: list[SimResult]):
    """Print a comparison table for multiple check configurations."""
    table = Table(
        title="[bold cyan]Configuration Comparison[/bold cyan]",
        box=box.ROUNDED,
        border_style="cyan",
        show_header=True,
        header_style="bold",
        expand=False,
    )
    table.add_column("Label", style="white", overflow="fold")
    table.add_column("F_base", style="dim", justify="right")
    table.add_column("F_post", style="green", justify="right")
    table.add_column("dF", justify="right")
    table.add_column("f_kept", style="yellow", justify="right")
    table.add_column("#anc", style="cyan", justify="center")
    table.add_column("+2Q", style="blue", justify="center")
    table.add_column("Score", style="magenta bold", justify="right")
    table.add_column("Grade", style="dim")

    best_score = max((r.score for r in results), default=0)

    for r in results:
        if r.error:
            continue
        delta = r.fidelity_post_selected - r.fidelity_no_checks
        delta_str = f"+{delta:.4f}" if delta >= 0 else f"{delta:.4f}"
        delta_style = "green" if delta >= 0 else "red"
        score_str = f"{r.score:.1f}"
        score_style = "bold green" if r.score == best_score else "magenta"
        table.add_row(
            r.label,
            f"{r.fidelity_no_checks:.4f}",
            f"{r.fidelity_post_selected:.4f}",
            f"[{delta_style}]{delta_str}[/{delta_style}]",
            f"{r.f_kept:.4f}",
            str(r.n_check_qubits),
            str(r.n_2q_gates_added),
            f"[{score_style}]{score_str}[/{score_style}]",
            grade(r.score),
        )
    console.print(table)
    console.print()


# -----------------------------------------------------------------------------
# Leaderboard display
# -----------------------------------------------------------------------------

def print_leaderboard(engine: GameEngine):
    lines = engine.get_leaderboard_lines()
    board = Table(
        title="[bold magenta][TROPHY]  LEADERBOARD[/bold magenta]",
        box=box.ROUNDED,
        border_style="magenta",
        expand=False,
    )
    board.add_column("Rank", style="bold", justify="center")
    board.add_column("Lvl", style="cyan", justify="center")
    board.add_column("Label", style="white", overflow="fold")
    board.add_column("Score", style="bold magenta", justify="right")
    board.add_column("F_post", style="green", justify="right")
    board.add_column("f_kept", style="yellow", justify="right")
    board.add_column("T", style="dim", justify="center")
    board.add_column("Grade", style="dim")

    for rank, entry in enumerate(engine.state.leaderboard.sorted_entries(), 1):
        board.add_row(
            str(rank),
            str(entry.level),
            entry.label[:35],
            f"{entry.score:.1f}",
            f"{entry.f_post:.4f}",
            f"{entry.f_kept:.4f}",
            str(entry.t_count),
            entry.grade,
        )
    console.print(board)
    total = engine.state.leaderboard.total_score()
    console.print(
        f"[bold cyan]Total score (best per level): {total:.1f}[/bold cyan]"
    )
    console.print()


# -----------------------------------------------------------------------------
# Main game loop
# -----------------------------------------------------------------------------

def run_game(n_shots: int = 2048):
    """Main interactive terminal game loop."""
    engine = GameEngine(n_shots=n_shots)
    console.clear()
    print_banner()

    while True:
        console.print(
            "[bold cyan]MAIN MENU[/bold cyan]  "
            "([bold]P[/bold])lay Level  "
            "([bold]S[/bold])weep Level  "
            "([bold]L[/bold])eaderboard  "
            "([bold]H[/bold])elp  "
            "([bold]Q[/bold])uit"
        )
        choice = Prompt.ask("[bold]Choice[/bold]", choices=["p","s","l","h","q","P","S","L","H","Q"], default="p")
        choice = choice.lower()

        if choice == "q":
            console.print("[dim]Goodbye! Keep those qubits coherent.[/dim]")
            break

        elif choice == "h":
            console.clear()
            print_banner()
            print_physics_primer()
            print_level_select()

        elif choice == "l":
            print_leaderboard(engine)

        elif choice == "p":
            # Play a specific level
            print_level_select()
            level_num = IntPrompt.ask("[bold]Select level[/bold]", default=engine.state.current_level)
            level_num = max(1, min(level_num, len(LEVELS)))

            console.clear()
            print_level_header(level_num)

            level = get_level(level_num)
            pc = level.payload_factory()
            print_circuit(pc.circuit, title=f"Payload Circuit: {pc.name}")

            target_qubits, n_checks = get_player_choices(level_num)

            console.print()
            with Progress(
                SpinnerColumn(),
                TextColumn("[bold cyan]{task.description}[/bold cyan]"),
                BarColumn(),
                transient=True,
            ) as progress_bar:
                task = progress_bar.add_task("Running Qiskit Aer simulation...", total=None)
                messages = []
                def on_progress(msg):
                    messages.append(msg)
                    progress_bar.update(task, description=msg[:70])

                result = engine.run_level(
                    level_num,
                    target_qubits=target_qubits,
                    n_checks=n_checks,
                    on_progress=on_progress,
                )

            # Show progress log
            if messages:
                console.print(Panel(
                    "\n".join(f"[dim]{m}[/dim]" for m in messages),
                    title="[dim]Simulation Log[/dim]",
                    border_style="dim",
                ))
                console.print()

            print_result(result, level_num)

            if result.error is None and Confirm.ask("[bold]Try another configuration on this level?[/bold]", default=True):
                pass  # loop continues, player can replay the level
            elif result.error is None:
                engine.advance_level()

        elif choice == "s":
            # Full sweep across check configurations
            print_level_select()
            level_num = IntPrompt.ask("[bold]Sweep level[/bold]", default=engine.state.current_level)
            level_num = max(1, min(level_num, len(LEVELS)))

            console.print(f"[bold]Running full configuration sweep for Level {level_num}...[/bold]")
            console.print("[dim](This will run multiple Qiskit simulations -- may take ~1 min)[/dim]")
            console.print()

            all_results = []
            with Progress(
                SpinnerColumn(),
                TextColumn("[bold cyan]{task.description}[/bold cyan]"),
                transient=False,
            ) as progress_bar:
                task = progress_bar.add_task("Sweeping configurations...", total=None)
                def sweep_progress(msg):
                    progress_bar.update(task, description=msg[:70])

                all_results = engine.run_comparison_sweep(
                    level_num, on_progress=sweep_progress
                )

            console.print()
            print_comparison_table(all_results)

            if all_results:
                best = max(all_results, key=lambda r: r.score)
                console.print(Panel(
                    f"[bold green]Best configuration:[/bold green]\n"
                    f"  {best.label}\n"
                    f"  Score = {best.score:.1f}  |  F_post = {best.fidelity_post_selected:.4f}  |  "
                    f"f_kept = {best.f_kept:.4f}\n\n"
                    f"[dim]Notice: score = F_post x f_kept x 1000 penalises strategies that keep too few shots.[/dim]",
                    title="[bold magenta][TROPHY]  Analysis[/bold magenta]",
                    border_style="magenta",
                ))
                console.print()


if __name__ == "__main__":
    shots = int(sys.argv[1]) if len(sys.argv) > 1 else 2048
    run_game(n_shots=shots)

