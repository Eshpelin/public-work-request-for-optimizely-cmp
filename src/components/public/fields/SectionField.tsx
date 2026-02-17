"use client";

import type { FieldProps } from "./types";

export default function SectionField({ field }: FieldProps) {
  return (
    <div className="w-full">
      <h3 className="text-lg font-bold">{field.label}</h3>
      {field.helper_text && (
        <p className="text-sm text-default-500 mt-1">{field.helper_text}</p>
      )}
      <hr className="mt-3 border-default-200" />
    </div>
  );
}
