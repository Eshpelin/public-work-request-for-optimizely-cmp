"use client";

import { Select, SelectItem } from "@heroui/react";
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

  const handleSelectionChange = (keys: "all" | Set<React.Key>) => {
    if (keys === "all") {
      onChange(visibleChoices.map((c) => c.id));
      return;
    }
    const selected = Array.from(keys);
    if (isMulti) {
      onChange(selected);
    } else {
      onChange(selected[0] ?? "");
    }
  };

  const selectedKeys = isMulti
    ? new Set(Array.isArray(value) ? (value as string[]) : [])
    : new Set(value ? [value as string] : []);

  return (
    <div className="w-full">
      <Select
        label={
          <>
            {field.name}
            {field.required && <span className="text-danger ml-1">*</span>}
          </>
        }
        placeholder={field.description || `Select ${field.name}`}
        selectionMode={isMulti ? "multiple" : "single"}
        selectedKeys={selectedKeys}
        onSelectionChange={handleSelectionChange}
        isInvalid={!!error}
        errorMessage={error}
        variant="bordered"
        classNames={{ label: "text-sm font-medium" }}
      >
        {visibleChoices.map((choice) => (
          <SelectItem key={choice.id}>{choice.name}</SelectItem>
        ))}
      </Select>
    </div>
  );
}
