"use client";

import { Textarea } from "@heroui/react";
import type { FieldProps } from "./types";

export default function BriefField({ field, value, onChange, error }: FieldProps) {
  return (
    <div className="w-full">
      <Textarea
        label={
          <>
            {field.label}
            {field.is_required && <span className="text-danger ml-1">*</span>}
          </>
        }
        placeholder={field.helper_text || "Enter brief details"}
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
