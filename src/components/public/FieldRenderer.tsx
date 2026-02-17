"use client";

import type { CmpFormField } from "@/types";
import {
  TextField,
  TextAreaField,
  RichTextField,
  CheckboxField,
  RadioButtonField,
  DropdownField,
  LabelField,
  DateField,
  FileField,
  BriefField,
  InstructionField,
  SectionField,
  PercentageNumberField,
  CurrencyNumberField,
} from "./fields";

interface FieldRendererProps {
  field: CmpFormField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  filteredChoiceIds?: string[];
}

const FIELD_COMPONENT_MAP: Record<
  string,
  React.ComponentType<FieldRendererProps>
> = {
  text: TextField,
  text_area: TextAreaField,
  richtext: RichTextField,
  checkbox: CheckboxField,
  radio_button: RadioButtonField,
  dropdown: DropdownField,
  label: LabelField,
  date: DateField,
  file: FileField,
  brief: BriefField,
  instruction: InstructionField,
  section: SectionField,
  percentage_number: PercentageNumberField,
  currency_number: CurrencyNumberField,
};

export default function FieldRenderer({
  field,
  value,
  onChange,
  error,
  filteredChoiceIds,
}: FieldRendererProps) {
  const Component = FIELD_COMPONENT_MAP[field.type];

  if (!Component) {
    return (
      <div className="w-full p-3 rounded-medium bg-warning-50 border border-warning-200 text-warning-700 text-sm">
        Unsupported field type. &quot;{field.type}&quot;
      </div>
    );
  }

  return (
    <Component
      field={field}
      value={value}
      onChange={onChange}
      error={error}
      filteredChoiceIds={filteredChoiceIds}
    />
  );
}
