"use client";

import { useEffect, useState } from "react";
import { Select } from "@/components/ui/field";
import { data, type LocalityLevel } from "@/lib/data";
import { usePrefs } from "@/lib/i18n/prefs";
import type { MessageKey } from "@/lib/i18n/messages";
import type { CourtLevel, LocalityNode } from "@/lib/types";

export interface LocalityValue {
  /** District courts, High Court or consumer commission; unset means the advocate's default from Settings. */
  level?: CourtLevel;
  stateId?: string;
  districtId?: string;
  complexId?: string;
  establishmentId?: string;
}

type Key = Exclude<keyof LocalityValue, "level">;

interface Step {
  key: Key;
  label: MessageKey;
  ask: MessageKey;
  first?: MessageKey; // placeholder while the parent is unchosen
  parent?: Key;
  depth: LocalityLevel; // the `depth` at which this step stops being shown
}

const DISTRICT_STEPS: Step[] = [
  { key: "stateId", label: "loc.state", ask: "loc.chooseState", depth: "state" },
  { key: "districtId", label: "loc.district", ask: "loc.chooseDistrict", first: "loc.stateFirst", parent: "stateId", depth: "district" },
  { key: "complexId", label: "loc.complex", ask: "loc.chooseComplex", first: "loc.districtFirst", parent: "districtId", depth: "complex" },
  { key: "establishmentId", label: "loc.court", ask: "loc.chooseCourt", first: "loc.complexFirst", parent: "complexId", depth: "establishment" },
];

// A High Court bench stands in for the district + complex; its sides stand in for the court.
const HIGH_STEPS: Step[] = [
  { key: "stateId", label: "loc.state", ask: "loc.chooseState", depth: "state" },
  { key: "complexId", label: "loc.bench", ask: "loc.chooseBench", first: "loc.stateFirst", parent: "stateId", depth: "complex" },
  { key: "establishmentId", label: "loc.side", ask: "loc.chooseSide", first: "loc.benchFirst", parent: "complexId", depth: "establishment" },
];

// A consumer commission (District, State or National) works the same way: commission, then bench.
const CONSUMER_STEPS: Step[] = [
  { key: "stateId", label: "loc.state", ask: "loc.chooseState", depth: "state" },
  { key: "complexId", label: "loc.commission", ask: "loc.chooseCommission", first: "loc.stateFirst", parent: "stateId", depth: "complex" },
  { key: "establishmentId", label: "loc.commissionBench", ask: "loc.chooseBench", first: "loc.commissionFirst", parent: "complexId", depth: "establishment" },
];

const STEPS: Record<CourtLevel, Step[]> = { district: DISTRICT_STEPS, high: HIGH_STEPS, consumer: CONSUMER_STEPS };

export const COURT_LEVELS = [
  ["district", "loc.districtCourts"],
  ["high", "loc.highCourt"],
  ["consumer", "loc.consumer"],
] as const;

const ORDER: LocalityLevel[] = ["state", "district", "complex", "establishment"];

/** The court level a value is in: its own, else the advocate's default. */
export function levelOf(value: LocalityValue, fallback: CourtLevel): CourtLevel {
  return value.level ?? fallback;
}

/**
 * District courts: state → district → complex → court. High Court: state → bench → side.
 * Consumer commission: state → commission → bench.
 * `depth` stops the cascade early (FIR search only needs a district, so it has no High Court mode).
 */
export function LocalityCascade({
  value,
  onChange,
  depth = "establishment",
  errors = {},
}: {
  value: LocalityValue;
  onChange: (v: LocalityValue) => void;
  depth?: LocalityLevel;
  errors?: Partial<Record<Key, string>>;
}) {
  const { t, courtLevel } = usePrefs();
  const highAllowed = depth !== "district" && depth !== "state";
  const level = highAllowed ? levelOf(value, courtLevel) : "district";
  const steps = STEPS[level].filter((s) => ORDER.indexOf(s.depth) <= ORDER.indexOf(depth));

  // Options cached per step and parent, so switching back to a parent shows its list at once.
  const [options, setOptions] = useState<Record<string, LocalityNode[]>>({});
  const cacheKey = (s: Step, parentId?: string) => `${level}:${s.key}:${parentId ?? ""}`;

  useEffect(() => {
    for (const s of steps) {
      const parentId = s.parent ? value[s.parent] : undefined;
      if (s.parent && !parentId) continue; // nothing to load until the parent is chosen
      const load =
        level !== "district" && s.key === "complexId"
          ? level === "high"
            ? data.highCourtBenches(parentId!)
            : data.consumerCommissions(parentId!)
          : data.locality(
              ({ stateId: "state", districtId: "district", complexId: "complex", establishmentId: "establishment" } as const)[s.key],
              parentId,
            );
      load.then((nodes) => setOptions((o) => ({ ...o, [cacheKey(s, parentId)]: nodes })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.stateId, value.districtId, value.complexId, depth, level]);

  function pick(step: Step, id: string) {
    const idx = steps.indexOf(step);
    const next: LocalityValue = { ...value, [step.key]: id || undefined };
    for (const s of steps.slice(idx + 1)) next[s.key] = undefined;
    if (level !== "district") {
      // Keep the district in step with the bench or commission, for anything that reads it.
      const bench = (options[cacheKey(STEPS[level][1], value.stateId)] ?? []).find((b) => b.id === next.complexId);
      next.districtId = bench?.parentId;
    }
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-4">
      {highAllowed && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">{t("loc.level")}</legend>
          <div className="flex flex-wrap gap-2">
            {COURT_LEVELS.map(([v, label]) => (
              <label
                key={v}
                className="flex min-h-11 flex-auto cursor-pointer items-center gap-2 whitespace-nowrap rounded-md border border-border px-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-subtle"
              >
                <input
                  type="radio"
                  name="court-level"
                  value={v}
                  checked={level === v}
                  onChange={() => onChange({ level: v })}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                {t(label)}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {steps.map((s) => {
          const parentId = s.parent ? value[s.parent] : undefined;
          const parentMissing = Boolean(s.parent && !parentId);
          return (
            <Select
              key={`${level}-${s.key}`}
              label={t(s.label)}
              value={value[s.key] ?? ""}
              onChange={(e) => pick(s, e.target.value)}
              disabled={parentMissing}
              placeholder={parentMissing && s.first ? t(s.first) : t(s.ask)}
              options={(parentMissing ? [] : (options[cacheKey(s, parentId)] ?? [])).map((n) => ({ value: n.id, label: n.name }))}
              error={errors[s.key]}
            />
          );
        })}
      </div>
    </div>
  );
}
