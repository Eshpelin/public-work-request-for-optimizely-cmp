"use client";

import { Input } from "@heroui/react";
import type { FieldProps } from "./types";

export default function PercentageNumberField({ field, value, onChange, error }: FieldProps) {
  const decimalPlaces = field.type_specific_meta?.decimal_places ?? 0;
  const step = decimalPlaces > 0 ? 1 / Math.pow(10, decimalPlaces) : 1;

  return (
    <div className="w-full">
      <Input
        type="number"
        label={
          <>
            {field.name}
            {field.required && <span className="text-danger ml-1">*</span>}
          </>
        }
        placeholder={field.description || "0"}
        value={value != null ? String(value) : ""}
        onValueChange={(val) => {
          const parsed = parseFloat(val);
          onChange(isNaN(parsed) ? "" : parsed);
        }}
        min={0}
        max={100}
        step={step}
        endContent={<span className="text-default-400 text-sm">%</span>}
        isInvalid={!!error}
        errorMessage={error}
        variant="bordered"
        classNames={{ label: "text-sm font-medium" }}
      />
    </div>
  );
}
