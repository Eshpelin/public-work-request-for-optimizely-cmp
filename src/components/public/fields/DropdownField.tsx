"use client";

import { useState } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
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
    return (
      <MultiSelectDropdown
        field={field}
        value={value}
        onChange={onChange}
        error={error}
        visibleChoices={visibleChoices}
      />
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
        <SelectTrigger id={field.identifier} className={cn("w-full", error && "border-destructive")}>
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

function MultiSelectDropdown({
  field,
  value,
  onChange,
  error,
  visibleChoices,
}: {
  field: FieldProps["field"];
  value: unknown;
  onChange: (val: unknown) => void;
  error?: string;
  visibleChoices: Array<{ id: string; name: string }>;
}) {
  const [open, setOpen] = useState(false);
  const selected = Array.isArray(value) ? (value as string[]) : [];

  const handleToggle = (choiceId: string, checked: boolean) => {
    if (checked) {
      onChange([...selected, choiceId]);
    } else {
      onChange(selected.filter((id) => id !== choiceId));
    }
  };

  const selectedLabels = visibleChoices
    .filter((c) => selected.includes(c.id))
    .map((c) => c.name);

  return (
    <div className="w-full space-y-2">
      <Label className="text-sm font-medium">
        {field.label}
        {field.is_required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              error && "border-destructive",
              selected.length === 0 && "text-muted-foreground"
            )}
          >
            <span className="truncate">
              {selectedLabels.length > 0
                ? selectedLabels.join(", ")
                : field.helper_text || `Select ${field.label}`}
            </span>
            <svg
              className="ml-2 h-4 w-4 shrink-0 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
          <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
            {visibleChoices.map((choice) => (
              <label
                key={choice.id}
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
              >
                <Checkbox
                  checked={selected.includes(choice.id)}
                  onCheckedChange={(checked) => handleToggle(choice.id, !!checked)}
                />
                {choice.name}
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {error && <p className="text-destructive text-xs mt-1">{error}</p>}
    </div>
  );
}
