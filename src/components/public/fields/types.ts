import type { CmpFormField } from "@/types";

/**
 * Common props shared by all field components.
 */
export interface FieldProps {
  field: CmpFormField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  filteredChoiceIds?: string[];
}
