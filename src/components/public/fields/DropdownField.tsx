"use client";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { FieldProps } from "./types";

export default function DropdownField({
  field,
  value,
  onChange,
  error,
  filteredChoiceIds,
}: FieldProps) {
  const choices = field.type_specific_meta?.choices ?? [];
  const isMulti = field.type_specific_meta?.is_multi_select ?? false;
  const visibleChoices = filteredChoiceIds
    ? choices.filter((c) => filteredChoiceIds.includes(c.id))
    : choices;

  if (isMulti) {
    // shadcn Select does not support multi-select natively.
    // Fall back to a checkbox-style multi-select using native select.
    const selected = Array.isArray(value) ? (value as string[]) : [];

    const handleMultiChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const opts = Array.from(e.target.selectedOptions, (o) => o.value);
      onChange(opts);
    };

    return (
      <div className="w-full space-y-2">
        <Label htmlFor={field.identifier} className="text-sm font-medium">
          {field.label}
          {field.is_required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <select
          id={field.identifier}
          multiple
          value={selected}
          onChange={handleMultiChange}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {visibleChoices.map((choice) => (
            <option key={choice.id} value={choice.id}>
              {choice.name}
            </option>
          ))}
        </select>
        {error && <p className="text-destructive text-xs mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      <Label htmlFor={field.identifier} className="text-sm font-medium">
        {field.label}
        {field.is_required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Select
        value={(value as string) ?? ""}
        onValueChange={(val) => onChange(val)}
      >
        <SelectTrigger id={field.identifier} className={`w-full ${error ? "border-destructive" : ""}`}>
          <SelectValue placeholder={field.helper_text || `Select ${field.label}`} />
        </SelectTrigger>
        <SelectContent>
          {visibleChoices.map((choice) => (
            <SelectItem key={choice.id} value={choice.id}>
              {choice.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
