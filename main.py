"""
main.py -- Entry point for Quantum Shield: The Spacetime Defender.

Usage:
    python main.py                    # full interactive game (2048 shots)
    python main.py --shots 512        # faster (fewer shots, noisier)
    python main.py --demo             # run demo sweep of all levels (non-interactive)
    python main.py --level 1          # jump directly to a level
    python main.py --benchmark        # run all levels and print final comparison table
"""

from __future__ import annotations
import argparse
import sys


def parse_args():
    parser = argparse.ArgumentParser(
        description="Quantum Shield: The Spacetime Defender -- QFF 2026 Hackathon"
    )
    parser.add_argument(
        "--shots", type=int, default=2048,
        help="Number of Aer simulation shots per run (default: 2048)",
    )
    parser.add_argument(
        "--demo", action="store_true",
        help="Run a non-interactive demo sweep of all levels",
    )
    parser.add_argument(
        "--benchmark", action="store_true",
        help="Run full benchmark across all levels and print comparison table",
    )
    parser.add_argument(
        "--level", type=int, default=None,
        help="Jump directly to a specific level number",
    )
    return parser.parse_args()


def run_demo(shots: int):
    """Non-interactive demo: sweep all levels and print results."""
    from rich.console import Console
    from rich.rule import Rule
    from game.game_engine import GameEngine
    from game.levels import LEVELS
    from game.ui_terminal import print_banner, print_comparison_table, print_leaderboard

    console = Console()
    engine = GameEngine(n_shots=shots)

    print_banner()
    console.print(f"[bold cyan]DEMO MODE[/bold cyan] -- sweeping all 6 levels with {shots} shots each\n")

    all_results = []
    for lvl in LEVELS:
        console.print(Rule(f"[bold]Level {lvl.number}: {lvl.title}[/bold]"))
        console.print(f"[dim]{lvl.physics_hint[:120]}...[/dim]\n")
        results = engine.run_comparison_sweep(
            lvl.number,
            on_progress=lambda m: console.print(f"  [dim]{m}[/dim]"),
        )
        all_results.extend(results)
        print_comparison_table(results)

    console.print(Rule("[bold magenta]FINAL LEADERBOARD[/bold magenta]"))
    print_leaderboard(engine)


def run_benchmark(shots: int):
    """Benchmark all levels at default qubit selections and print table."""
    from rich.console import Console
    from game.game_engine import GameEngine
    from game.levels import LEVELS
    from game.ui_terminal import print_banner, print_comparison_table, print_leaderboard

    console = Console()
    engine = GameEngine(n_shots=shots)

    print_banner()
    console.print(f"[bold]BENCHMARK MODE[/bold] -- {shots} shots per run\n")

    results = []
    for lvl in LEVELS:
        console.print(f"  Running Level {lvl.number}: {lvl.title}...")
        r = engine.run_level(
            lvl.number,
            target_qubits=lvl.default_target_qubits,
            n_checks=min(1, lvl.ancilla_budget),
            on_progress=lambda m: console.print(f"    [dim]{m}[/dim]"),
        )
        results.append(r)

    print_comparison_table(results)
    print_leaderboard(engine)


def main():
    args = parse_args()

    if args.demo:
        run_demo(args.shots)
    elif args.benchmark:
        run_benchmark(args.shots)
    else:
        from game.ui_terminal import run_game
        if args.level is not None:
            # Jump to a specific level in interactive mode
            from game.game_engine import GameEngine
            from game.levels import get_level
            from game.ui_terminal import (
                console, print_banner, print_level_header,
                print_circuit, get_player_choices, print_result,
                print_leaderboard
            )
            from rich.progress import Progress, SpinnerColumn, TextColumn
            engine = GameEngine(n_shots=args.shots)
            print_banner()
            lvl_num = args.level
            print_level_header(lvl_num)
            lvl = get_level(lvl_num)
            pc = lvl.payload_factory()
            print_circuit(pc.circuit, title=f"{pc.name}")
            target_qubits, n_checks = get_player_choices(lvl_num)
            with Progress(SpinnerColumn(), TextColumn("{task.description}"), transient=True) as pb:
                t = pb.add_task("Simulating...", total=None)
                def on_prog(m): pb.update(t, description=m[:60])
                result = engine.run_level(lvl_num, target_qubits, n_checks, on_progress=on_prog)
            print_result(result, lvl_num)
            print_leaderboard(engine)
        else:
            run_game(n_shots=args.shots)


if __name__ == "__main__":
    main()

