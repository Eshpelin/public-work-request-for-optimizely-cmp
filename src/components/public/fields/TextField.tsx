"use client";

import { Input } from "@heroui/react";
import type { FieldProps } from "./types";

export default function TextField({ field, value, onChange, error }: FieldProps) {
  return (
    <div className="w-full">
      <Input
        label={
          <>
            {field.label}
            {field.is_required && <span className="text-danger ml-1">*</span>}
          </>
        }
        placeholder={field.helper_text || `Enter ${field.label}`}
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
