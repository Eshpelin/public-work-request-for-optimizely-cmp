"use client";

import type { FieldProps } from "./types";

export default function InstructionField({ field }: FieldProps) {
  const html = field.type_specific_meta?.description ?? "";

  return (
    <div className="w-full rounded-medium bg-blue-50 border border-blue-200 p-4">
      {field.name && (
        <p className="text-sm font-semibold text-blue-800 mb-2">{field.name}</p>
      )}
      {html && (
        <div
          className="text-sm text-blue-700 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
}
