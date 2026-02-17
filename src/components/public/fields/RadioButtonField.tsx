"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { FieldProps } from "./types";

export default function RadioButtonField({
  field,
  value,
  onChange,
  error,
  filteredChoiceIds,
}: FieldProps) {
  const choices = field.type_specific_meta?.choices ?? [];
  const visibleChoices = filteredChoiceIds
    ? choices.filter((c) => filteredChoiceIds.includes(c.id))
    : choices;

  return (
    <div className="w-full space-y-2">
      <Label className="text-sm font-medium">
        {field.label}
        {field.is_required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <RadioGroup
        value={(value as string) ?? ""}
        onValueChange={(val) => onChange(val)}
      >
        {visibleChoices.map((choice) => (
          <div key={choice.id} className="flex items-center space-x-2">
            <RadioGroupItem value={choice.id} id={`${field.identifier}-${choice.id}`} />
            <Label htmlFor={`${field.identifier}-${choice.id}`} className="font-normal">
              {choice.name}
            </Label>
          </div>
        ))}
      </RadioGroup>
      {error && <p className="text-destructive text-xs mt-1">{error}</p>}
    </div>
  );
}
