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
import { readDeepLink, writeDeepLink } from "@/lib/location";
import {
  initial,
  parseProgress,
  recordBest,
  STORAGE_KEY,
  MISSION_VERSION,
  missionUnlocked,
  migrateProgress,
  type Progress,
} from "@/lib/progress";
import type { MissionLevel as Level, Outcome } from "@/lib/missions/contracts";
import { Tutorial } from "./Tutorial";
import { Mission } from "./Mission";
import { TeamCredits } from "./TeamCredits";
export function Game() {
  const [levels, setLevels] = useState<Level[]>([]),
    [progress, setProgress] = useState<Progress>(initial),
    [ready, setReady] = useState(false),
    [screen, setScreen] = useState<"map" | "tutorial" | "mission">("map"),
    [selected, setSelected] = useState<Level | null>(null),
    [entrySchool, setEntrySchool] = useState<number | null>(null),
    [pendingMission, setPendingMission] = useState<number | null>(null),
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
      let saved = parseProgress(localStorage.getItem(STORAGE_KEY));
      if (saved.missionVersion !== MISSION_VERSION) {
        if (Object.keys(saved.best).length)
          try {
            localStorage.setItem(
              saved.missionVersion === 1
                ? "quantum-shield.archived-missions-v1"
                : "quantum-shield.archived-missions-v2",
              JSON.stringify(saved.best),
            );
          } catch {
            setStorageError(
              "Previous mission scores could not be archived; tutorial progress is retained.",
            );
          }
        saved = migrateProgress(saved);
      }
      setProgress(saved);
      const link = readDeepLink(window.location.search);
      if (link?.kind === "school") {
        const allowed = saved.tutorial !== "new" || link.id - 1 <= saved.step;
        setEntrySchool(allowed ? link.id - 1 : saved.step);
        setScreen("tutorial");
        if (!allowed)
          setStorageError(
            "Complete the preceding Flight Schools or use the visible tutorial skip.",
          );
      } else if (link?.kind === "mission" && missionUnlocked(saved, link.id)) {
        setPendingMission(link.id);
        setScreen("mission");
      } else if (saved.tutorial === "new") setScreen("tutorial");
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
    if (pendingMission && levels.length) {
      setSelected(levels.find((level) => level.id === pendingMission) || null);
      setPendingMission(null);
    }
  }, [pendingMission, levels]);
  useEffect(() => {
    if (!ready) return;
    if (screen === "map") writeDeepLink(null);
    else if (screen === "mission" && selected)
      writeDeepLink({ kind: "mission", id: selected.id });
  }, [ready, screen, selected]);
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
  function win(r: Outcome) {
    setProgress((p) =>
      recordBest(
        p,
        r.levelId,
        Math.round(r.combinedScore * 1000),
        r.passed
          ? r.combinedScore >= r.target + 0.05
            ? 3
            : r.combinedScore >= r.target + 0.025
              ? 2
              : 1
          : 0,
      ),
    );
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
              start={entrySchool ?? (unlocked ? 0 : progress.step)}
              onNavigate={(step) =>
                writeDeepLink({ kind: "school", id: step + 1 })
              }
              onStep={(step) => setProgress((p) => ({ ...p, step }))}
              onFinish={() => unlock("complete")}
              onSkip={() => unlock("skipped")}
              onBack={() => setScreen("map")}
              unlocked={unlocked}
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
                    Protect fixed circuits. Catch invisible glitches.
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
              {(progress.best[10]?.stars || 0) > 0 && (
                <div className="notice">
                  <ShieldCheck size={20} />
                  <strong>Master Spacetime Architect</strong>
                  <span>
                    Final mission certification earned · saved on this device
                  </span>
                </div>
              )}
              <div className="section-heading mission-heading">
                <div>
                  <p className="eyebrow">CHOOSE YOUR NEXT EXPERIMENT</p>
                  <h2>Mission control</h2>
                </div>
                <span className="chip">
                  {unlocked
                    ? progress.tutorial === "skipped"
                      ? "All missions unlocked"
                      : completed === 10
                        ? "Expedition complete"
                        : "Next mission ready"
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
                    disabled={!missionUnlocked(progress, l.id)}
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
                    experiments into a learning journey. Explore automatic Pauli
                    checks, localized protection, and non-Clifford T gates in
                    the shared circuit workspace.
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
              <TeamCredits />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
