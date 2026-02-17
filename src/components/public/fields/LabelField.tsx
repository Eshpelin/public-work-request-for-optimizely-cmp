"use client";

import { Chip } from "@heroui/react";
import type { FieldProps } from "./types";

export default function LabelField({
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

  const selectedIds = isMulti
    ? Array.isArray(value)
      ? (value as string[])
      : []
    : value
      ? [value as string]
      : [];

  const handleToggle = (choiceId: string) => {
    if (isMulti) {
      const current = Array.isArray(value) ? (value as string[]) : [];
      if (current.includes(choiceId)) {
        onChange(current.filter((id) => id !== choiceId));
      } else {
        onChange([...current, choiceId]);
      }
    } else {
      onChange(value === choiceId ? "" : choiceId);
    }
  };

  return (
    <div className="w-full">
      <label className="text-sm font-medium mb-2 block">
        {field.label}
        {field.is_required && <span className="text-danger ml-1">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {visibleChoices.map((choice) => {
          const isSelected = selectedIds.includes(choice.id);
          return (
            <Chip
              key={choice.id}
              variant={isSelected ? "solid" : "bordered"}
              className="cursor-pointer select-none"
              style={
                choice.color
                  ? isSelected
                    ? { backgroundColor: choice.color, borderColor: choice.color, color: "#fff" }
                    : { borderColor: choice.color, color: choice.color }
                  : undefined
              }
              onClick={() => handleToggle(choice.id)}
            >
              {choice.name}
            </Chip>
          );
        })}
      </div>
      {error && <p className="text-danger text-xs mt-1">{error}</p>}
    </div>
  );
}
