"use client";
import { useEffect, useState } from "react";
import {
  Atom,
  ArrowUpRight,
  BookOpen,
  Lock,
  ShieldCheck,
  Star,
  RotateCcw,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  initial,
  parseProgress,
  recordBest,
  STORAGE_KEY,
  type Progress,
} from "@/lib/progress";
import type { Level, Result } from "@/lib/types";
import { Tutorial } from "./Tutorial";
import { Mission } from "./Mission";
export function Game() {
  const [levels, setLevels] = useState<Level[]>([]),
    [progress, setProgress] = useState<Progress>(initial),
    [ready, setReady] = useState(false),
    [screen, setScreen] = useState<"map" | "tutorial" | "mission">("map"),
    [selected, setSelected] = useState<Level | null>(null),
    [error, setError] = useState(""),
    [storageError, setStorageError] = useState("");
  async function load() {
    setError("");
    try {
      setLevels(await api<Level[]>("levels"));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    try {
      const saved = parseProgress(localStorage.getItem(STORAGE_KEY));
      setProgress(saved);
      if (saved.tutorial === "new") setScreen("tutorial");
    } catch {
      setStorageError(
        "Storage is unavailable. Progress will last for this session only.",
      );
      setScreen("tutorial");
    }
    setReady(true);
    void load();
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      } catch {
        setStorageError(
          "Progress could not be saved. Keep this tab open to retain this session.",
        );
      }
  }, [progress, ready]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);
  const unlocked = progress.tutorial !== "new",
    stars = Object.values(progress.best).reduce((n, r) => n + r.stars, 0),
    completed = Object.values(progress.best).filter((r) => r.stars > 0).length;
  function unlock(status: "complete" | "skipped") {
    setProgress((p) => ({ ...p, tutorial: status }));
    setScreen("map");
  }
  function win(r: Result) {
    setProgress((p) => recordBest(p, r.levelId, r.score, r.stars));
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a href="#main" className="brand">
          <span>
            <Atom size={27} />
          </span>
          <div>
            QUANTUM<small>SHIELD</small>
          </div>
        </a>
        <p className="nav-label">YOUR EXPEDITION</p>
        <nav aria-label="Main navigation">
          <button
            className={screen !== "tutorial" ? "active" : ""}
            onClick={() => setScreen("map")}
          >
            <ShieldCheck size={19} /> Mission control
          </button>
          <button
            className={screen === "tutorial" ? "active" : ""}
            onClick={() => setScreen("tutorial")}
          >
            <BookOpen size={19} /> Flight school
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="pilot-avatar">Q</div>
          <b>Quantum explorer</b>
          <small>Local pilot profile</small>
          <div className="pilot-stat">
            <span>{completed}/10 missions</span>
            <span>
              <Star size={13} /> {stars}/30
            </span>
          </div>
          <div className="progress-track">
            <span style={{ width: `${completed * 10}%` }} />
          </div>
          <p>
            QFF Advanced Track
            <br />
            Spacetime error detection
          </p>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>LEARN BY EXPERIMENTING</span>
          <span className={levels.length ? "status-dot" : "muted"}>
            {levels.length
              ? "Qiskit engine connected"
              : "Connecting to engine…"}
          </span>
        </header>
        <main id="main">
          {storageError && (
            <p role="status" className="notice">
              {storageError}
            </p>
          )}
          {error && (
            <div role="alert" className="error">
              {error}{" "}
              <button onClick={load}>
                <RotateCcw size={14} /> Retry connection
              </button>
            </div>
          )}
          {!ready ? (
            <div className="empty">Loading your expedition…</div>
          ) : screen === "tutorial" ? (
            <Tutorial
              start={unlocked ? 0 : progress.step}
              onStep={(step) => setProgress((p) => ({ ...p, step }))}
              onFinish={() => unlock("complete")}
              onSkip={() => unlock("skipped")}
            />
          ) : screen === "mission" && selected ? (
            <Mission
              key={selected.id}
              level={selected}
              onBack={() => setScreen("map")}
              onWin={win}
              sound={progress.sound}
              onSound={() => setProgress((p) => ({ ...p, sound: !p.sound }))}
            />
          ) : (
            <>
              <section className="hero">
                <div>
                  <p className="eyebrow">
                    <span className="tiny-star">✦</span> THE QUANTUM SHIELD
                    EXPEDITION
                  </p>
                  <h1>
                    A noisy universe.
                    <br />
                    <em>A clearer signal.</em>
                  </h1>
                  <p>
                    Build quantum circuits. Catch invisible glitches.
                    <br />
                    Discover how a little protection goes a long way.
                  </p>
                  <div className="actions">
                    <button
                      className="primary"
                      onClick={() => {
                        const next =
                          levels.find((l) => !progress.best[l.id]?.stars) ||
                          levels[0];
                        if (unlocked && next) {
                          setSelected(next);
                          setScreen("mission");
                        } else setScreen("tutorial");
                      }}
                    >
                      {unlocked ? "Continue expedition" : "Start flight school"}{" "}
                      <ArrowUpRight size={19} />
                    </button>
                    <button
                      className="ghost"
                      onClick={() => setScreen("tutorial")}
                    >
                      {unlocked
                        ? "Revisit the basics"
                        : "6 tiny experiments · beginner friendly"}
                    </button>
                  </div>
                </div>
                <div className="hero-graphic" aria-hidden="true">
                  <div className="orbit orbit-a" />
                  <div className="orbit orbit-b" />
                  <div className="orbit orbit-c" />
                  <div className="hero-core">ψ</div>
                  <span className="floating-label label-a">
                    |ψ〉 = α|0〉 + β|1〉
                  </span>
                  <span className="floating-label label-b">
                    SIGNAL PROTECTED ✦
                  </span>
                </div>
              </section>
              <div className="dashboard-stats">
                <div>
                  <strong>10</strong>
                  <span>Hands-on missions</span>
                </div>
                <div>
                  <strong>
                    {completed}
                    <small> / 10</small>
                  </strong>
                  <span>Signals protected</span>
                </div>
                <div>
                  <strong>
                    {stars}
                    <small> / 30</small>
                  </strong>
                  <span>Stars collected</span>
                </div>
                <div>
                  <strong>Qiskit 2+</strong>
                  <span>Real quantum simulation</span>
                </div>
              </div>
              <div className="section-heading mission-heading">
                <div>
                  <p className="eyebrow">CHOOSE YOUR NEXT EXPERIMENT</p>
                  <h2>Mission control</h2>
                </div>
                <span className="chip">
                  {unlocked
                    ? "All missions unlocked"
                    : "Complete flight school to unlock"}
                </span>
              </div>
              {!unlocked && (
                <div className="notice">
                  <Lock size={18} /> Start with flight school, or{" "}
                  <button onClick={() => unlock("skipped")}>
                    Skip Tutorial / Unlock All Levels
                  </button>
                </div>
              )}
              <div className="mission-grid">
                {levels.map((l) => (
                  <button
                    className={`mission-card ${progress.best[l.id]?.stars ? "completed" : ""}`}
                    key={l.id}
                    disabled={!unlocked}
                    onClick={() => {
                      setSelected(l);
                      setScreen("mission");
                    }}
                  >
                    <div className="card-top">
                      <span className="mission-number">
                        {String(l.id).padStart(2, "0")}
                      </span>
                      <span>
                        {!unlocked ? (
                          <Lock size={19} />
                        ) : progress.best[l.id]?.stars ? (
                          <ShieldCheck size={20} />
                        ) : (
                          <ArrowUpRight size={20} />
                        )}
                      </span>
                    </div>
                    <p className="eyebrow">{l.chapter}</p>
                    <h3>{l.title}</h3>
                    <p>{l.subtitle}</p>
                    <div className="card-footer">
                      <span>
                        {l.qubits}Q · {l.checkBudget} helper
                        {l.checkBudget === 1 ? "" : "s"}
                      </span>
                      <span className="stars">
                        {[1, 2, 3].map((s) => (
                          <Star
                            size={13}
                            key={s}
                            fill={
                              s <= (progress.best[l.id]?.stars || 0)
                                ? "currentColor"
                                : "none"
                            }
                          />
                        ))}
                      </span>
                    </div>
                    {progress.best[l.id] && (
                      <small className="best">
                        Personal best · {progress.best[l.id].score}
                      </small>
                    )}
                  </button>
                ))}
              </div>
              <div className="panel field-note">
                <Atom />
                <div>
                  <h3>Small checks. Big questions.</h3>
                  <p>
                    These ten authored missions translate the advanced-track
                    experiments into a learning journey. Explore automatic
                    Paulice checks, target ordering, circuit depth, and
                    non-Clifford T gates in each mission’s Research Lab.
                  </p>
                  <a
                    href="https://arxiv.org/abs/2504.15725"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Read the research paper ↗
                  </a>
                </div>
              </div>
            </>
          )}
          <footer>
            Quantum Shield · Stage 1 · Personal progress stays on this device.
            <br />
            Simulation is educational; no quantum hardware account is required.
          </footer>
        </main>
      </div>
    </div>
  );
}
