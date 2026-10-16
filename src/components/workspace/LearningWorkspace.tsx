"use client";
import { CSSProperties, ReactNode, useEffect, useRef, useState } from "react";
export type MobilePane = "Theory" | "Experiment" | "Results";
export function LearningWorkspace({
  header,
  theory,
  experiment,
  results,
  mobilePane,
  onMobilePane,
}: {
  header: ReactNode;
  theory: ReactNode;
  experiment: ReactNode;
  results: ReactNode;
  mobilePane: MobilePane;
  onMobilePane: (p: MobilePane) => void;
}) {
  const [width, setWidth] = useState(36),
    [height, setHeight] = useState(60),
    [storageNotice, setStorageNotice] = useState("");
  const root = useRef<HTMLDivElement>(null),
    right = useRef<HTMLDivElement>(null),
    ready = useRef(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("quantum-shield.workspace.v1");
      if (raw) {
        const p = JSON.parse(raw);
        if (
          typeof p.width === "number" &&
          Number.isFinite(p.width) &&
          typeof p.height === "number" &&
          Number.isFinite(p.height)
        ) {
          setWidth(Math.max(20, Math.min(60, p.width)));
          setHeight(Math.max(30, Math.min(75, p.height)));
        }
      }
    } catch {
      setStorageNotice(
        "Layout preferences are available for this session only.",
      );
    }
    ready.current = true;
  }, []);
  useEffect(() => {
    if (ready.current)
      try {
        localStorage.setItem(
          "quantum-shield.workspace.v1",
          JSON.stringify({ width, height }),
        );
      } catch {
        setStorageNotice(
          "Layout preferences are available for this session only.",
        );
      }
  }, [width, height]);
  function horizontal(value: number) {
    const w = root.current?.getBoundingClientRect().width || 1100;
    setWidth(
      Math.max((320 / w) * 100, Math.min(60, ((w - 568) / w) * 100, value)),
    );
  }
  function drag(event: React.PointerEvent, axis: "x" | "y") {
    event.currentTarget.setPointerCapture(event.pointerId);
    const element = event.currentTarget as HTMLDivElement;
    const move = (e: PointerEvent) => {
      const box = (
        axis === "x" ? root : right
      ).current?.getBoundingClientRect();
      if (!box) return;
      if (axis === "x") horizontal(((e.clientX - box.left) / box.width) * 100);
      else
        setHeight(
          Math.max(
            30,
            Math.min(75, ((e.clientY - box.top) / box.height) * 100),
          ),
        );
    };
    const stop = () => {
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerup", stop);
      element.removeEventListener("pointercancel", stop);
    };
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerup", stop);
    element.addEventListener("pointercancel", stop);
  }
  return (
    <div
      className="noise-workspace"
      style={
        {
          "--theory-width": `${width}%`,
          "--experiment-height": `${height}%`,
        } as CSSProperties
      }
    >
      {header}
      <nav className="nw-mobile-tabs" aria-label="Workspace panes">
        {(["Theory", "Experiment", "Results"] as const).map((p) => (
          <button
            key={p}
            aria-pressed={p === mobilePane}
            onClick={() => onMobilePane(p)}
          >
            {p}
          </button>
        ))}
      </nav>
      <div className="nw-layout" ref={root}>
        <section
          aria-label="Theory pane"
          className={`nw-theory nw-pane ${mobilePane === "Theory" ? "mobile-active" : ""}`}
        >
          {theory}
        </section>
        <div
          role="separator"
          tabIndex={0}
          aria-label="Resize theory pane"
          aria-orientation="vertical"
          aria-valuemin={20}
          aria-valuemax={60}
          aria-valuenow={Math.round(width)}
          className="nw-split nw-split-x"
          onPointerDown={(e) => drag(e, "x")}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.preventDefault();
              horizontal(width + (e.key === "ArrowRight" ? 2 : -2));
            }
          }}
        />
        <div className="nw-right" ref={right}>
          <section
            aria-label="Experiment pane"
            className={`nw-experiment nw-pane ${mobilePane === "Experiment" ? "mobile-active" : ""}`}
          >
            {experiment}
          </section>
          <div
            role="separator"
            tabIndex={0}
            aria-label="Resize experiment pane"
            aria-orientation="horizontal"
            aria-valuemin={30}
            aria-valuemax={75}
            aria-valuenow={Math.round(height)}
            className="nw-split nw-split-y"
            onPointerDown={(e) => drag(e, "y")}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                e.preventDefault();
                setHeight(
                  Math.max(
                    30,
                    Math.min(75, height + (e.key === "ArrowDown" ? 2 : -2)),
                  ),
                );
              }
            }}
          />
          <section
            aria-label="Results pane"
            className={`nw-results nw-pane ${mobilePane === "Results" ? "mobile-active" : ""}`}
          >
            {results}
          </section>
        </div>
      </div>
      <div className="nw-status">
        <span>
          {storageNotice ||
            "Your experiment stays on this device · No attempt limits"}
        </span>
        <button
          onClick={() => {
            setWidth(36);
            setHeight(60);
          }}
        >
          Restore default layout
        </button>
      </div>
    </div>
  );
}
