"use client";

import { Input } from "@heroui/react";
import type { FieldProps } from "./types";

export default function TextField({ field, value, onChange, error }: FieldProps) {
  return (
    <div className="w-full">
      <Input
        label={
          <>
            {field.name}
            {field.required && <span className="text-danger ml-1">*</span>}
          </>
        }
        placeholder={field.description || `Enter ${field.name}`}
        value={(value as string) ?? ""}
        onValueChange={(val) => onChange(val)}
        isInvalid={!!error}
        errorMessage={error}
        variant="bordered"
        classNames={{ label: "text-sm font-medium" }}
      />
    </div>
  );
}
