"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { FieldProps } from "./types";

export default function CheckboxField({
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

  const selected = Array.isArray(value) ? (value as string[]) : [];

  const handleToggle = (choiceId: string, checked: boolean) => {
    if (checked) {
      onChange([...selected, choiceId]);
    } else {
      onChange(selected.filter((id) => id !== choiceId));
    }
  };

  return (
    <div className="w-full space-y-2">
      <Label className="text-sm font-medium">
        {field.label}
        {field.is_required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="flex flex-col gap-2">
        {visibleChoices.map((choice) => (
          <div key={choice.id} className="flex items-center space-x-2">
            <Checkbox
              id={`${field.identifier}-${choice.id}`}
              checked={selected.includes(choice.id)}
              onCheckedChange={(checked) => handleToggle(choice.id, !!checked)}
            />
            <Label htmlFor={`${field.identifier}-${choice.id}`} className="font-normal">
              {choice.name}
            </Label>
          </div>
        ))}
      </div>
      {error && <p className="text-destructive text-xs mt-1">{error}</p>}
    </div>
  );
}
