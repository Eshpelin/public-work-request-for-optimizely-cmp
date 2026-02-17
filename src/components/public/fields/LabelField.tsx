"use client";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
    <div className="w-full space-y-2">
      <Label className="text-sm font-medium">
        {field.label}
        {field.is_required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="flex flex-wrap gap-2">
        {visibleChoices.map((choice) => {
          const isSelected = selectedIds.includes(choice.id);
          return (
            <Badge
              key={choice.id}
              variant={isSelected ? "default" : "outline"}
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
            </Badge>
          );
        })}
      </div>
      {error && <p className="text-destructive text-xs mt-1">{error}</p>}
    </div>
  );
}
