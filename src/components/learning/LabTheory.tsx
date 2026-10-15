"use client";
import { ReactNode, useState } from "react";
function inline(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    .map((v, i) =>
      v.startsWith("**") ? (
        <strong key={i}>{v.slice(2, -2)}</strong>
      ) : v.startsWith("`") ? (
        <code key={i}>{v.slice(1, -1)}</code>
      ) : (
        v
      ),
    );
}
export function MarkdownLesson({ source }: { source: string }) {
  const lines = source.split("\n"),
    nodes: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith("```")) {
      i++;
      const code = [];
      while (i < lines.length && !lines[i].startsWith("```"))
        code.push(lines[i++]);
      i++;
      nodes.push(
        <pre className="nw-formula" key={i}>
          {code.join("\n")}
        </pre>,
      );
      continue;
    }
    if (line.startsWith("#")) {
      nodes.push(<h2 key={i}>{inline(line.replace(/^#+\s*/, ""))}</h2>);
      i++;
      continue;
    }
    if (line.startsWith("|")) {
      const table = [];
      while (i < lines.length && lines[i].startsWith("|"))
        table.push(
          lines[i++]
            .split("|")
            .slice(1, -1)
            .map((v) => v.trim()),
        );
      nodes.push(
        <div className="nw-table-scroll" key={i}>
          <table>
            <thead>
              <tr>
                {table[0].map((v, j) => (
                  <th key={j}>{inline(v)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.slice(2).map((row, r) => (
                <tr key={r}>
                  {row.map((v, c) => (
                    <td key={c}>{inline(v)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (line.startsWith("- ")) {
      const items = [];
      while (i < lines.length && lines[i].startsWith("- "))
        items.push(lines[i++].slice(2));
      nodes.push(
        <ul key={i}>
          {items.map((v, j) => (
            <li key={j}>{inline(v)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    const paragraph = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#|```|\||- )/.test(lines[i])
    )
      paragraph.push(lines[i++]);
    nodes.push(<p key={i}>{inline(paragraph.join(" "))}</p>);
  }
  return <>{nodes}</>;
}
export function LabTheory({
  number,
  title,
  source,
  examples,
  checklist,
  knowledge,
}: {
  number: number;
  title: string;
  source: string;
  examples: ReactNode;
  checklist: ReactNode;
  knowledge?: ReactNode;
}) {
  const [tab, setTab] = useState("Description");
  return (
    <>
      <div className="nw-pane-heading">
        <span className="nw-kicker">
          {String(number).padStart(2, "0")} / FLIGHT SCHOOL
        </span>
        <h1>{title}</h1>
        <p>
          {number === 2
            ? "Same experiment. Three different jobs."
            : "Build the check. Follow the operator."}
        </p>
      </div>
      <nav className="nw-theory-tabs" aria-label="Lesson sections">
        {[
          "Description",
          "Examples",
          ...(knowledge ? ["Knowledge Check"] : []),
        ].map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>
      <div className="nw-article" hidden={tab !== "Description"}>
        <MarkdownLesson source={source} />
      </div>
      <div className="nw-article" hidden={tab !== "Examples"}>
        {examples}
      </div>
      {knowledge && (
        <div className="nw-article" hidden={tab !== "Knowledge Check"}>
          {knowledge}
        </div>
      )}
      <div className="nw-theory-footer">
        {checklist}
        {knowledge && (
          <button onClick={() => setTab("Knowledge Check")}>
            Open knowledge check →
          </button>
        )}
      </div>
    </>
  );
}
