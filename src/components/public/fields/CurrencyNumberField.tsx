"use client";

import { Input } from "@heroui/react";
import type { FieldProps } from "./types";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "\u20AC",
  GBP: "\u00A3",
  JPY: "\u00A5",
  AUD: "A$",
  CAD: "C$",
};

export default function CurrencyNumberField({ field, value, onChange, error }: FieldProps) {
  const currencyCode = field.type_specific_meta?.currency_code ?? "USD";
  const symbol = CURRENCY_SYMBOLS[currencyCode] ?? currencyCode;
  const decimalPlaces = field.type_specific_meta?.decimal_places ?? 2;
  const step = decimalPlaces > 0 ? 1 / Math.pow(10, decimalPlaces) : 1;

  return (
    <div className="w-full">
      <Input
        type="number"
        label={
          <>
            {field.label}
            {field.is_required && <span className="text-danger ml-1">*</span>}
          </>
        }
        placeholder={field.helper_text || "0.00"}
        value={value != null ? String(value) : ""}
        onValueChange={(val) => {
          const parsed = parseFloat(val);
          onChange(isNaN(parsed) ? "" : parsed);
        }}
        min={0}
        step={step}
        startContent={<span className="text-default-400 text-sm">{symbol}</span>}
        isInvalid={!!error}
        errorMessage={error}
        variant="bordered"
        classNames={{ label: "text-sm font-medium" }}
      />
    </div>
  );
}
