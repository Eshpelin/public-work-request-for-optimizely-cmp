"use client";

import { useCallback, useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CmpFormField, PublicFormConfig } from "@/types";
import { FormState, FormAction } from "@/lib/form-engine/types";
import { validateAllFields } from "@/lib/form-engine/validators";
import FieldRenderer from "./FieldRenderer";
import { useConditionalLogic } from "./useConditionalLogic";

interface DynamicFormProps {
  formConfig: PublicFormConfig;
  token: string;
}

function getDefaultValue(field: CmpFormField): unknown {
  switch (field.type) {
    case "text":
    case "text_area":
    case "richtext":
    case "brief":
    case "radio_button":
    case "date":
      return "";
    case "checkbox":
      return [];
    case "dropdown":
    case "label":
      return field.type_specific_meta?.is_multi_select ? [] : "";
    case "percentage_number":
    case "currency_number":
      return undefined;
    case "file":
      return null;
    default:
      return "";
  }
}

function buildInitialState(fields: CmpFormField[]): FormState {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    values[field.identifier] = getDefaultValue(field);
  }
  return {
    values,
    errors: {},
    visibleFields: new Set(fields.map((f) => f.identifier)),
    filteredChoices: {},
    touched: {},
  };
}

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_VALUE":
      return {
        ...state,
        values: { ...state.values, [action.field]: action.value },
      };
    case "SET_ERROR":
      return {
        ...state,
        errors: { ...state.errors, [action.field]: action.error },
      };
    case "CLEAR_ERROR": {
      const { [action.field]: _, ...rest } = state.errors;
      return { ...state, errors: rest };
    }
    case "SET_ERRORS":
      return { ...state, errors: action.errors };
    case "SET_VISIBLE_FIELDS":
      return { ...state, visibleFields: action.fields };
    case "SET_FILTERED_CHOICES":
      return {
        ...state,
        filteredChoices: {
          ...state.filteredChoices,
          [action.field]: action.choiceIds,
        },
      };
    case "SET_TOUCHED":
      return {
        ...state,
        touched: { ...state.touched, [action.field]: true },
      };
    case "RESET":
      return buildInitialState([]);
    default:
      return state;
  }
}

export default function DynamicForm({ formConfig, token }: DynamicFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fields = formConfig.fields.sort((a, b) => a.sort_order - b.sort_order);
  const [state, dispatch] = useReducer(formReducer, fields, buildInitialState);

  const handleVisibilityChange = useCallback(
    (visibleFields: Set<string>) => {
      dispatch({ type: "SET_VISIBLE_FIELDS", fields: visibleFields });
    },
    []
  );

  const handleFilteredChoicesChange = useCallback(
    (field: string, choiceIds: string[]) => {
      dispatch({ type: "SET_FILTERED_CHOICES", field, choiceIds });
    },
    []
  );

  useConditionalLogic(
    fields,
    state.values,
    handleVisibilityChange,
    handleFilteredChoicesChange
  );

  const handleFieldChange = useCallback(
    (identifier: string, value: unknown) => {
      dispatch({ type: "SET_VALUE", field: identifier, value });
      dispatch({ type: "SET_TOUCHED", field: identifier });
      dispatch({ type: "CLEAR_ERROR", field: identifier });
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const honeypotValue = (e.target as HTMLFormElement).querySelector<HTMLInputElement>(
      `input[name="${formConfig.honeypotFieldName}"]`
    )?.value;

    if (honeypotValue) {
      router.push(`/f/${token}/success`);
      return;
    }

    const errors = validateAllFields(fields, state.values, state.visibleFields);
    if (Object.keys(errors).length > 0) {
      dispatch({ type: "SET_ERRORS", errors });
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("token", token);

      const jsonValues: Record<string, unknown> = {};
      const fileFields: Array<{ identifier: string; files: File[] }> = [];

      for (const field of fields) {
        if (!state.visibleFields.has(field.identifier)) continue;

        const value = state.values[field.identifier];

        if (field.type === "file" && value) {
          const files = value instanceof FileList ? Array.from(value) : Array.isArray(value) ? value : [value];
          fileFields.push({ identifier: field.identifier, files: files as File[] });
        } else {
          jsonValues[field.identifier] = value;
        }
      }

      formData.append("formData", JSON.stringify(jsonValues));

      for (const { identifier, files } of fileFields) {
        for (const file of files) {
          formData.append(`file_${identifier}`, file);
        }
      }

      const response = await fetch("/api/v1/public/submissions", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "Submission failed");
      }

      router.push(`/f/${token}/success`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          {formConfig.title}
        </h1>
        {formConfig.description && (
          <p className="mt-2 text-muted-foreground">{formConfig.description}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div
          aria-hidden="true"
          style={{ position: "absolute", left: "-9999px", opacity: 0 }}
        >
          <input
            type="text"
            name={formConfig.honeypotFieldName}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {fields.map((field) => {
          if (!state.visibleFields.has(field.identifier)) {
            return null;
          }

          return (
            <FieldRenderer
              key={field.identifier}
              field={field}
              value={state.values[field.identifier]}
              onChange={(value) =>
                handleFieldChange(field.identifier, value)
              }
              error={state.errors[field.identifier]}
              filteredChoiceIds={state.filteredChoices[field.identifier]}
            />
          );
        })}

        {submitError && (
          <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
            {submitError}
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={submitting}
          className="w-full"
        >
          {submitting && <Spinner size="sm" />}
          {submitting ? "Submitting..." : "Submit"}
        </Button>
      </form>
    </div>
  );
}
