/**
 * Serializers for converting form state values into the CMP API format.
 * Each field type has specific rules for how its value is represented
 * in the form_fields array of a work request payload.
 */

import { CmpFormField } from "@/types";

/** The shape of a single serialized field entry for the CMP API. */
export interface SerializedFieldEntry {
  identifier: string;
  type: string;
  values: unknown[];
}

/**
 * Serialize a single field value into the CMP API format.
 * Returns null for field types that should be skipped (file, instruction, section).
 */
export function serializeFieldValue(
  field: CmpFormField,
  value: unknown,
): SerializedFieldEntry | null {
  const { identifier, type } = field;

  switch (type) {
    case "text":
    case "text_area":
    case "richtext":
    case "brief": {
      const stringValue = typeof value === "string" ? value : "";
      return { identifier, type, values: [stringValue] };
    }

    case "checkbox": {
      const arrayValue = Array.isArray(value) ? value : [];
      return { identifier, type, values: arrayValue };
    }

    case "dropdown":
    case "label": {
      const isMulti = field.type_specific_meta?.is_multi_select === true;
      if (isMulti) {
        const arrayValue = Array.isArray(value) ? value : [];
        return { identifier, type, values: arrayValue };
      }
      const stringValue = typeof value === "string" ? value : "";
      return { identifier, type, values: [stringValue] };
    }

    case "radio_button": {
      const stringValue = typeof value === "string" ? value : "";
      return { identifier, type, values: [stringValue] };
    }

    case "date": {
      const stringValue = typeof value === "string" ? value : "";
      return { identifier, type, values: [stringValue] };
    }

    case "percentage_number":
    case "currency_number": {
      const numericValue = typeof value === "number" ? value : 0;
      return { identifier, type, values: [numericValue] };
    }

    case "file":
    case "instruction":
    case "section": {
      // These field types are not serialized.
      return null;
    }

    default: {
      return null;
    }
  }
}

/**
 * Serialize all visible, non-display fields into the CMP API format.
 * Fields that are not visible or that return null from serialization are excluded.
 */
export function serializeFormData(
  fields: CmpFormField[],
  values: Record<string, unknown>,
  visibleFields: Set<string>,
): SerializedFieldEntry[] {
  const result: SerializedFieldEntry[] = [];

  for (const field of fields) {
    if (!visibleFields.has(field.identifier)) {
      continue;
    }

    const entry = serializeFieldValue(field, values[field.identifier]);
    if (entry !== null) {
      result.push(entry);
    }
  }

  return result;
}
