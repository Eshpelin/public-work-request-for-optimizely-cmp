/**
 * TypeScript types for the Optimizely CMP public work request application.
 */

// Field types supported by CMP form templates.
export type CmpFieldType =
  | "text"
  | "text_area"
  | "richtext"
  | "checkbox"
  | "radio_button"
  | "dropdown"
  | "label"
  | "date"
  | "file"
  | "brief"
  | "instruction"
  | "section"
  | "percentage_number"
  | "currency_number";

// A single selectable choice within a dropdown, radio, or checkbox field.
export interface CmpChoice {
  id: string;
  name: string;
  color?: string;
}

// Metadata specific to certain field types (e.g. dropdowns, currency fields).
export interface CmpTypeSpecificMeta {
  is_multi_select?: boolean;
  choices?: CmpChoice[];
  description?: string;
  decimal_places?: number;
  currency_code?: string;
  has_thousand_separator?: boolean;
}

// A single condition within a logic rule, evaluated against a field value.
export interface CmpLogicCondition {
  field_identifier: string;
  operator: "equal";
  values: string[];
}

// A rule that controls conditional visibility or navigation between fields.
export interface CmpLogicRule {
  action: "jump_to" | "show_values";
  target_identifier: string;
  conditions: CmpLogicCondition[];
}

// A single field within a CMP form template.
export interface CmpFormField {
  identifier: string;
  name: string;
  type: CmpFieldType;
  required: boolean;
  description?: string;
  type_specific_meta?: CmpTypeSpecificMeta | null;
  logic_rules?: CmpLogicRule[];
  order: number;
}

// A CMP template containing form fields for work requests.
export interface CmpTemplate {
  id: string;
  name: string;
  description?: string;
  form_fields: CmpFormField[];
}

// A CMP workflow that can be assigned to a work request.
export interface CmpWorkflow {
  id: string;
  name: string;
  description?: string;
}

// A snapshot of a form field, stored alongside the public form config.
export type FormFieldSnapshot = CmpFormField;

// Configuration for a public-facing form, stored and served to end users.
export interface PublicFormConfig {
  id: string;
  title: string;
  description?: string;
  templateName: string;
  fields: FormFieldSnapshot[];
  honeypotFieldName: string;
}

// The payload sent when a user submits the public form.
export interface SubmissionPayload {
  token: string;
  formData: Record<string, unknown>;
  honeypot?: string;
}

// Standard error response shape returned by API routes.
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}
