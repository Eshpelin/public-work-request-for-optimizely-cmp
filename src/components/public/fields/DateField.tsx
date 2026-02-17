"use client";

import type { FieldProps } from "./types";

export default function DateField({ field, value, onChange, error }: FieldProps) {
  return (
    <div className="w-full">
      <label className="text-sm font-medium mb-1 block">
        {field.name}
        {field.required && <span className="text-danger ml-1">*</span>}
      </label>
      <input
        type="date"
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-medium border px-3 py-2 text-sm outline-none transition-colors
          ${error ? "border-danger" : "border-default-300 hover:border-default-400 focus:border-primary"}`}
      />
      {field.description && (
        <p className="text-default-400 text-xs mt-1">{field.description}</p>
      )}
      {error && <p className="text-danger text-xs mt-1">{error}</p>}
    </div>
  );
}
