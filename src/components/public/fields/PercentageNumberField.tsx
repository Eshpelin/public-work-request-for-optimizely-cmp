"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FieldProps } from "./types";

export default function PercentageNumberField({ field, value, onChange, error }: FieldProps) {
  const decimalPlaces = field.type_specific_meta?.decimal_places ?? 0;
  const step = decimalPlaces > 0 ? 1 / Math.pow(10, decimalPlaces) : 1;

  return (
    <div className="w-full space-y-2">
      <Label htmlFor={field.identifier} className="text-sm font-medium">
        {field.label}
        {field.is_required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="relative">
        <Input
          id={field.identifier}
          type="number"
          placeholder={field.helper_text || "0"}
          value={value != null ? String(value) : ""}
          onChange={(e) => {
            const parsed = parseFloat(e.target.value);
            onChange(isNaN(parsed) ? "" : parsed);
          }}
          min={0}
          max={100}
          step={step}
          className={`pr-8 ${error ? "border-destructive" : ""}`}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
          %
        </span>
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
