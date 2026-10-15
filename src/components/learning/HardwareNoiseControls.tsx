"use client";
import type { Hardware } from "@/lib/timeline/contracts";
export function HardwareNoiseControls({
  value,
  onChange,
  disabled = false,
}: {
  value: Hardware;
  onChange: (v: Hardware) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="ql-settings" disabled={disabled}>
      <legend>
        Hardware noise · independent channels on every unmeasured wire
      </legend>
      <label>
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
        />{" "}
        Enable hardware noise
      </label>
      <p>
        After each occupied quantum layer, every live data and helper wire
        receives these random channels. Extra check layers add exposure. Empty
        columns add no time; terminally measured wires stop receiving noise.
        Probabilities below are per layer, not deterministic error gates.
      </p>
      {(
        [
          ["bitFlip", "Bit-flip probability", 0.3, 0.001],
          ["phaseFlip", "Phase-flip probability", 0.3, 0.001],
          ["depolarizing", "Depolarizing strength", 0.3, 0.001],
          ["relaxationTimeUs", "Relaxation time per layer (μs)", 20, 1],
        ] as const
      ).map(([key, label, max, step]) => (
        <label key={key}>
          {label}{" "}
          <b>{value[key].toFixed(key === "relaxationTimeUs" ? 0 : 3)}</b>
          <input
            aria-label={label}
            type="range"
            min={0}
            max={max}
            step={step}
            value={value[key]}
            onChange={(e) => onChange({ ...value, [key]: +e.target.value })}
          />
        </label>
      ))}
      <label>
        T1 (μs)
        <input
          aria-label="Hardware T1"
          type="number"
          min={20}
          max={200}
          value={value.t1Us}
          onChange={(e) => {
            const n = +e.target.value;
            if (n >= 20 && n <= 200)
              onChange({
                ...value,
                t1Us: n,
                t2Us: Math.min(value.t2Us, 2 * n),
              });
          }}
        />
      </label>
      <label>
        T2 (μs)
        <input
          aria-label="Hardware T2"
          type="number"
          min={1}
          max={2 * value.t1Us}
          value={value.t2Us}
          onChange={(e) => {
            const n = +e.target.value;
            if (n > 0 && n <= 2 * value.t1Us) onChange({ ...value, t2Us: n });
          }}
        />
      </label>
    </fieldset>
  );
}
