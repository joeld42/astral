import { useRef } from "react";

export default function Dial({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const drag = useRef<{ x: number; y: number; value: number } | null>(null);
  const set = (n: number) => {
    if (Number.isFinite(n))
      onChange(
        Math.max(
          min,
          Math.min(
            max,
            Number((min + Math.round((n - min) / step) * step).toFixed(6)),
          ),
        ),
      );
  };
  const fraction = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const angle = -135 + fraction * 270;
  return (
    <div className="dial-control">
      <div
        className="dial-face"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value}${unit}`}
        title="Drag up or right to increase. Hold Shift for fine adjustment. Arrow keys also work."
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.focus();
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, value };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (d)
            set(
              d.value +
                (((d.y - e.clientY + (e.clientX - d.x)) * (max - min)) / 180) *
                  (e.shiftKey ? 0.1 : 1),
            );
        }}
        onPointerUp={(e) => {
          drag.current = null;
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onLostPointerCapture={() => {
          drag.current = null;
        }}
        onKeyDown={(e) => {
          const delta = e.shiftKey ? step * 10 : step;
          if (
            [
              "ArrowUp",
              "ArrowRight",
              "ArrowDown",
              "ArrowLeft",
              "Home",
              "End",
              "PageUp",
              "PageDown",
            ].includes(e.key)
          ) {
            e.preventDefault();
            set(
              e.key === "Home"
                ? min
                : e.key === "End"
                  ? max
                  : value +
                    (["ArrowDown", "ArrowLeft", "PageDown"].includes(e.key)
                      ? -1
                      : 1) *
                      delta *
                      (e.key.startsWith("Page") ? 10 : 1),
            );
          }
        }}
      >
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <circle
            className="dial-track"
            cx="24"
            cy="24"
            r="19"
            pathLength="360"
            strokeDasharray="270 90"
            transform="rotate(135 24 24)"
          />
          <circle
            className="dial-amount"
            cx="24"
            cy="24"
            r="19"
            pathLength="360"
            strokeDasharray={`${fraction * 270} 360`}
            transform="rotate(135 24 24)"
          />
          <circle className="dial-body" cx="24" cy="24" r="13" />
          <line
            x1="24"
            y1="24"
            x2="24"
            y2="13"
            transform={`rotate(${angle} 24 24)`}
          />
        </svg>
      </div>
      <label className="dial-label">
        {label}
        <span className="dial-value">
          <input
            aria-label={`${label} value`}
            type="number"
            min={min}
            max={max}
            step={step}
            value={Number(value.toFixed(4))}
            onChange={(e) => {
              if (e.target.value !== "") set(e.target.valueAsNumber);
            }}
          />
          <span>{unit}</span>
        </span>
      </label>
    </div>
  );
}
