"use client";

import { Checkbox } from "@heroui/react";
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

  const handleToggle = (choiceId: string, isChecked: boolean) => {
    if (isChecked) {
      onChange([...selected, choiceId]);
    } else {
      onChange(selected.filter((id) => id !== choiceId));
    }
  };

  return (
    <div className="w-full">
      <label className="text-sm font-medium mb-2 block">
        {field.name}
        {field.required && <span className="text-danger ml-1">*</span>}
      </label>
      <div className="flex flex-col gap-2">
        {visibleChoices.map((choice) => (
          <Checkbox
            key={choice.id}
            isSelected={selected.includes(choice.id)}
            onValueChange={(isChecked) => handleToggle(choice.id, isChecked)}
          >
            {choice.name}
          </Checkbox>
        ))}
      </div>
      {error && <p className="text-danger text-xs mt-1">{error}</p>}
    </div>
  );
}
