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
    case "text_area": {
      const stringValue = typeof value === "string" ? value : "";
      return { identifier, type, values: [stringValue] };
    }

    case "richtext":
    case "brief": {
      // CMP expects brief/richtext values as objects with type "text_brief" and an HTML value.
      const stringValue = typeof value === "string" ? value : "";
      return { identifier, type, values: [{ type: "text_brief", value: stringValue }] };
    }

    case "checkbox": {
      const arrayValue = Array.isArray(value) ? (value as string[]) : [];
      const choices = field.type_specific_meta?.choices ?? [];
      const choiceObjects = arrayValue
        .map((id) => choices.find((c) => c.id === id))
        .filter(Boolean)
        .map((c) => ({ id: c!.id, name: c!.name }));
      return { identifier, type, values: choiceObjects };
    }

    case "dropdown":
    case "label": {
      const choices = field.type_specific_meta?.choices ?? [];
      const isMulti = field.type_specific_meta?.is_multi_select === true;
      if (isMulti) {
        const arrayValue = Array.isArray(value) ? (value as string[]) : [];
        const choiceObjects = arrayValue
          .map((id) => choices.find((c) => c.id === id))
          .filter(Boolean)
          .map((c) => ({ id: c!.id, name: c!.name }));
        return { identifier, type, values: choiceObjects };
      }
      const stringValue = typeof value === "string" ? value : "";
      const choice = choices.find((c) => c.id === stringValue);
      if (choice) {
        return { identifier, type, values: [{ id: choice.id, name: choice.name }] };
      }
      return { identifier, type, values: [stringValue] };
    }

    case "radio_button": {
      const choices = field.type_specific_meta?.choices ?? [];
      const stringValue = typeof value === "string" ? value : "";
      const choice = choices.find((c) => c.id === stringValue);
      if (choice) {
        return { identifier, type, values: [{ id: choice.id, name: choice.name }] };
      }
      return { identifier, type, values: [stringValue] };
    }

    case "date": {
      const stringValue = typeof value === "string" ? value : "";
      // CMP expects datetime in ISO format with timezone.
      const formatted = stringValue && !stringValue.includes("T")
        ? `${stringValue}T00:00:00Z`
        : stringValue;
      return { identifier, type, values: [formatted] };
    }

    case "percentage_number":
    case "currency_number": {
      // CMP expects string values, not raw numbers.
      const stringValue = value != null && value !== "" ? String(value) : "0";
      return { identifier, type, values: [stringValue] };
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
