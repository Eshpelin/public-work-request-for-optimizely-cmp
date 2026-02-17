"use client";

import { Textarea } from "@heroui/react";
import type { FieldProps } from "./types";

export default function RichTextField({ field, value, onChange, error }: FieldProps) {
  return (
    <div className="w-full">
      <Textarea
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
        minRows={6}
        classNames={{ label: "text-sm font-medium" }}
        description="Supports HTML formatting"
      />
    </div>
  );
}
