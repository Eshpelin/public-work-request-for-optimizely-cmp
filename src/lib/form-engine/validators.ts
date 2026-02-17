/**
 * Shared validators for CMP form fields.
 * Used by both client-side form validation and server-side submission validation.
 */

import { CmpFormField } from "@/types";

/**
 * Strip HTML tags from a string to check for meaningful content.
 */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

/**
 * Check whether a given choice ID exists in the field's choices list.
 */
function isValidChoiceId(field: CmpFormField, id: string): boolean {
  const choices = field.type_specific_meta?.choices ?? [];
  return choices.some((choice) => choice.id === id);
}

/**
 * Validate a single form field value and return an error message or null.
 * Returns null when the value is valid.
 */
export function validateField(
  field: CmpFormField,
  value: unknown,
): string | null {
  const { type, is_required } = field;

  switch (type) {
    case "text":
    case "text_area": {
      if (is_required) {
        if (typeof value !== "string" || value.trim() === "") {
          return `${field.label} is required.`;
        }
      }
      return null;
    }

    case "richtext":
    case "brief": {
      if (is_required) {
        if (typeof value !== "string" || stripHtmlTags(value) === "") {
          return `${field.label} is required.`;
        }
      }
      return null;
    }

    case "checkbox": {
      if (is_required) {
        if (!Array.isArray(value) || value.length === 0) {
          return `${field.label} requires at least one selection.`;
        }
      }
      if (Array.isArray(value)) {
        for (const id of value) {
          if (typeof id !== "string" || !isValidChoiceId(field, id)) {
            return `${field.label} contains an invalid selection.`;
          }
        }
      }
      return null;
    }

    case "radio_button": {
      if (is_required) {
        if (typeof value !== "string" || value === "") {
          return `${field.label} is required.`;
        }
      }
      if (typeof value === "string" && value !== "") {
        if (!isValidChoiceId(field, value)) {
          return `${field.label} contains an invalid selection.`;
        }
      }
      return null;
    }

    case "dropdown":
    case "label": {
      const isMulti = field.type_specific_meta?.is_multi_select === true;

      if (isMulti) {
        if (is_required) {
          if (!Array.isArray(value) || value.length === 0) {
            return `${field.label} requires at least one selection.`;
          }
        }
        if (Array.isArray(value)) {
          for (const id of value) {
            if (typeof id !== "string" || !isValidChoiceId(field, id)) {
              return `${field.label} contains an invalid selection.`;
            }
          }
        }
      } else {
        if (is_required) {
          if (typeof value !== "string" || value === "") {
            return `${field.label} is required.`;
          }
        }
        if (typeof value === "string" && value !== "") {
          if (!isValidChoiceId(field, value)) {
            return `${field.label} contains an invalid selection.`;
          }
        }
      }
      return null;
    }

    case "date": {
      if (is_required) {
        if (typeof value !== "string" || value.trim() === "") {
          return `${field.label} is required.`;
        }
      }
      if (typeof value === "string" && value.trim() !== "") {
        const parsed = new Date(value);
        if (isNaN(parsed.getTime())) {
          return `${field.label} must be a valid date.`;
        }
      }
      return null;
    }

    case "file": {
      if (is_required) {
        if (!value) {
          return `${field.label} is required.`;
        }
      }
      return null;
    }

    case "percentage_number": {
      if (is_required) {
        if (typeof value !== "number" || isNaN(value)) {
          return `${field.label} is required.`;
        }
      }
      if (typeof value === "number" && !isNaN(value)) {
        if (value < 0 || value > 100) {
          return `${field.label} must be between 0 and 100.`;
        }
      }
      return null;
    }

    case "currency_number": {
      if (is_required) {
        if (typeof value !== "number" || isNaN(value)) {
          return `${field.label} is required.`;
        }
      }
      if (typeof value === "number" && !isNaN(value)) {
        if (value < 0) {
          return `${field.label} must be 0 or greater.`;
        }
      }
      return null;
    }

    case "instruction":
    case "section": {
      // Display-only fields. No validation needed.
      return null;
    }

    default: {
      return null;
    }
  }
}

/**
 * Validate all visible fields and return a map of field identifier to error message.
 * Only fields present in the visibleFields set are validated.
 */
export function validateAllFields(
  fields: CmpFormField[],
  values: Record<string, unknown>,
  visibleFields: Set<string>,
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    if (!visibleFields.has(field.identifier)) {
      continue;
    }

    const error = validateField(field, values[field.identifier]);
    if (error) {
      errors[field.identifier] = error;
    }
  }

  return errors;
}
