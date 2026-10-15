"use client";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { api } from "../api";
import type { Diagnostic } from "../flight-school-1/contracts";

export function useWorkbench<T>(
  key: string,
  initial: T,
  schema: z.ZodType<T>,
  generate: (m: T) => string,
  compilePath: string,
  modelKey: "experiment" | "draft",
  compileExtras: (m: T) => object = () => ({}),
) {
  const [model, setModel] = useState<T>(initial),
    [source, setSource] = useState(generate(initial)),
    [dirty, setDirty] = useState(false),
    [editor, setEditor] = useState<"Visual" | "Code">("Visual"),
    [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [undo, setUndo] = useState<T[]>([]),
    [redo, setRedo] = useState<T[]>([]),
    [stale, setStale] = useState(true);
  const revision = useRef(0),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const saved = z
          .object({
            model: schema,
            source: z.string().max(8192),
            dirty: z.boolean(),
            editor: z.enum(["Visual", "Code"]),
          })
          .safeParse(JSON.parse(raw));
        if (saved.success) {
          setModel(saved.data.model);
          setSource(saved.data.source);
          setDirty(saved.data.dirty);
          setEditor(saved.data.editor);
        } else
          setNotice(
            "Saved lab draft was invalid. Only this draft was reset; mission progress is safe.",
          );
      }
    } catch {
      setNotice("Draft storage is unavailable. Your session remains usable.");
    }
    setReady(true);
    return () => {
      mounted.current = false;
      revision.current++;
    };
  }, [key]);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(
          key,
          JSON.stringify({ model, source, dirty, editor }),
        );
      } catch {
        setNotice(
          "Local storage is full or unavailable. Keep this tab open to retain your work.",
        );
      }
  }, [key, ready, model, source, dirty, editor]);
  function invalidate() {
    revision.current++;
    setBusy(false);
    setStale(true);
  }
  function change(next: T, fromCode = false) {
    if (dirty && !fromCode) {
      setError(
        "Apply or discard unapplied code before editing the visual circuit.",
      );
      return false;
    }
    const p = schema.safeParse(next);
    if (!p.success) {
      setError(p.error.issues[0].message);
      return false;
    }
    setUndo((v) => [...v.slice(-29), model]);
    setRedo([]);
    setModel(p.data);
    setSource(generate(p.data));
    setDirty(false);
    setDiagnostics([]);
    setError("");
    invalidate();
    return true;
  }
  function history(direction: "undo" | "redo") {
    if (dirty) {
      setError("Apply or discard code before using history.");
      return;
    }
    const stack = direction === "undo" ? undo : redo,
      next = stack.at(-1);
    if (!next) return;
    if (direction === "undo") {
      setUndo(undo.slice(0, -1));
      setRedo([...redo.slice(-29), model]);
    } else {
      setRedo(redo.slice(0, -1));
      setUndo([...undo.slice(-29), model]);
    }
    setModel(next);
    setSource(generate(next));
    setError("");
    invalidate();
  }
  async function parse() {
    const token = revision.current;
    const r = await api<{
      experiment?: T | null;
      draft?: T | null;
      diagnostics: Diagnostic[];
    }>(compilePath, { code: source, ...compileExtras(model) });
    if (!mounted.current || token !== revision.current) return null;
    setDiagnostics(r.diagnostics);
    const next = r[modelKey];
    if (!next) {
      setError(
        "Code was not applied. Fix the source diagnostics; the previous circuit was not executed.",
      );
      return null;
    }
    if (change(next, true)) return next;
    return null;
  }
  async function applySource() {
    const token = revision.current;
    setBusy(true);
    try {
      await parse();
    } catch (e) {
      if (mounted.current && token === revision.current)
        setError((e as Error).message);
    } finally {
      if (mounted.current && token === revision.current) setBusy(false);
    }
  }
  async function execute<R>(
    path: string,
    body: (m: T) => unknown,
    accept: (r: R, model: T) => void,
  ) {
    let token = revision.current;
    setBusy(true);
    setError("");
    try {
      let current = model;
      if (dirty) {
        if (editor !== "Code") {
          setError("Apply or discard unapplied code before running.");
          return;
        }
        const parsed = await parse();
        if (!parsed) return;
        current = parsed;
      }
      token = ++revision.current;
      setBusy(true);
      const r = await api<R>(path, body(current));
      if (mounted.current && token === revision.current) {
        accept(r,current);
        setStale(false);
      }
    } catch (e) {
      if (mounted.current && token === revision.current)
        setError((e as Error).message);
    } finally {
      if (mounted.current && token === revision.current) setBusy(false);
    }
  }
  return {
    model,
    source,
    dirty,
    editor,
    setEditor,
    diagnostics,
    error,
    setError,
    notice,
    ready,
    busy,
    stale,
    revision,
    mounted,
    change,
    history,
    canUndo: !!undo.length,
    canRedo: !!redo.length,
    invalidate,
    execute,
    applySource,
    editSource: (s: string) => {
      setSource(s);
      setDirty(true);
      setDiagnostics([]);
      invalidate();
    },
    discardSource: () => {
      setSource(generate(model));
      setDirty(false);
      setDiagnostics([]);
      setError("");
      invalidate();
    },
  };
}

export function useLocalProgress<T>(
  key: string,
  schema: z.ZodType<T>,
  initial: T,
) {
  const [value, setValue] = useState<T>(initial),
    [ready, setReady] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = schema.safeParse(JSON.parse(raw));
        if (parsed.success) setValue(parsed.data);
        else
          setNotice(
            "Saved module evidence was invalid; existing mission unlocks remain intact.",
          );
      }
    } catch {
      setNotice("Progress is saved for this session only.");
    }
    setReady(true);
  }, [key]);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        setNotice("Progress storage is unavailable; keep this session open.");
      }
  }, [value, key, ready]);
  return { value, setValue, notice, ready };
}
