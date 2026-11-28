"use client";

import type { WorkflowParameter } from "../../_features/workflows/types";

type GenerationParameterInputProps = {
  parameter: WorkflowParameter;
  value: unknown;
  onChange: (value: unknown) => void;
};

export function GenerationParameterInput({
  parameter,
  value,
  onChange,
}: GenerationParameterInputProps) {
  const options = parameter.options?.map(String);
  if (parameter.type === "boolean") {
    return (
      <label className="workbench-field parameter-checkbox">
        <span>{parameter.label}</span>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
      </label>
    );
  }
  if (options?.length) {
    return (
      <label className="workbench-field">
        <span>{parameter.label}</span>
        <select
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <label className="workbench-field">
      <span>{parameter.label}</span>
      <input
        type={
          parameter.type === "integer" || parameter.type === "number"
            ? "number"
            : "text"
        }
        value={String(value ?? "")}
        min={parameter.min}
        max={parameter.max}
        onChange={(event) =>
          onChange(
            parameter.type === "integer" || parameter.type === "number"
              ? Number(event.target.value)
              : event.target.value,
          )
        }
      />
    </label>
  );
}

export function acceptForAssetType(assetType?: string) {
  if (assetType === "video") return "video/*,.mkv,.mov";
  if (assetType === "audio") return "audio/*,.m4a,.flac,.ogg";
  if (assetType === "file") return ".txt,.json,.csv,.pdf,.srt,.ass";
  return "image/*";
}
