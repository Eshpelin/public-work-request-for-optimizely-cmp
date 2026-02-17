"use client";

import { RadioGroup, Radio } from "@heroui/react";
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
    <div className="w-full">
      <RadioGroup
        label={
          <>
            {field.name}
            {field.required && <span className="text-danger ml-1">*</span>}
          </>
        }
        value={(value as string) ?? ""}
        onValueChange={(val) => onChange(val)}
        isInvalid={!!error}
        errorMessage={error}
        classNames={{ label: "text-sm font-medium" }}
      >
        {visibleChoices.map((choice) => (
          <Radio key={choice.id} value={choice.id}>
            {choice.name}
          </Radio>
        ))}
      </RadioGroup>
    </div>
  );
}
