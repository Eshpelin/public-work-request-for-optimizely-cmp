"use client";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { FieldProps } from "./types";

export default function TextAreaField({ field, value, onChange, error }: FieldProps) {
  return (
    <div className="w-full space-y-2">
      <Label htmlFor={field.identifier} className="text-sm font-medium">
        {field.label}
        {field.is_required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Textarea
        id={field.identifier}
        placeholder={field.helper_text || `Enter ${field.label}`}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className={error ? "border-destructive" : ""}
      />
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
