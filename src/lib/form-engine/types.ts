import { CmpFieldType, CmpFormField } from "@/types";

export interface FieldRegistryEntry {
  component: string;
  validator: (field: CmpFormField, value: unknown) => string | null;
  serializer: (
    field: CmpFormField,
    value: unknown,
  ) => { identifier: string; type: string; values: unknown[] } | null;
  defaultValue: unknown;
}

export type FieldRegistry = Record<CmpFieldType, FieldRegistryEntry>;

export interface FormState {
  values: Record<string, unknown>;
  errors: Record<string, string>;
  visibleFields: Set<string>;
  filteredChoices: Record<string, string[]>;
  touched: Record<string, boolean>;
}

export type FormAction =
  | { type: "SET_VALUE"; field: string; value: unknown }
  | { type: "SET_ERROR"; field: string; error: string }
  | { type: "CLEAR_ERROR"; field: string }
  | { type: "SET_ERRORS"; errors: Record<string, string> }
  | { type: "SET_VISIBLE_FIELDS"; fields: Set<string> }
  | { type: "SET_FILTERED_CHOICES"; field: string; choiceIds: string[] }
  | { type: "SET_TOUCHED"; field: string }
  | { type: "RESET" };
