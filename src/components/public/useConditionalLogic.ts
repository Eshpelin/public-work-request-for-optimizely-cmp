"use client";

import { useCallback, useEffect, useRef } from "react";
import { CmpFormField, CmpLogicRule } from "@/types";

interface ConditionalLogicResult {
  visibleFields: Set<string>;
  filteredChoices: Record<string, string[]>;
}

/**
 * Evaluates whether all conditions in a logic rule are met
 * based on the current form values.
 */
function evaluateConditions(
  rule: CmpLogicRule,
  values: Record<string, unknown>
): boolean {
  return rule.conditions.every((condition) => {
    const fieldValue = values[condition.field_identifier];

    if (condition.operator === "equal") {
      if (Array.isArray(fieldValue)) {
        return condition.values.some((v) => fieldValue.includes(v));
      }
      return condition.values.includes(String(fieldValue ?? ""));
    }

    return false;
  });
}

/**
 * Computes which fields are visible and which choices are filtered
 * based on the current form values and the logic rules defined
 * on each field.
 */
export function computeConditionalLogic(
  fields: CmpFormField[],
  values: Record<string, unknown>
): ConditionalLogicResult {
  const allIdentifiers = fields.map((f) => f.identifier);
  const visibleFields = new Set<string>(allIdentifiers);
  const filteredChoices: Record<string, string[]> = {};

  const sortedFields = [...fields].sort((a, b) => a.order - b.order);

  for (const field of sortedFields) {
    if (!field.logic_rules || field.logic_rules.length === 0) {
      continue;
    }

    for (const rule of field.logic_rules) {
      const conditionsMet = evaluateConditions(rule, values);

      if (rule.action === "jump_to" && conditionsMet) {
        const currentIndex = sortedFields.findIndex(
          (f) => f.identifier === field.identifier
        );
        const targetIndex = sortedFields.findIndex(
          (f) => f.identifier === rule.target_identifier
        );

        if (currentIndex !== -1 && targetIndex !== -1 && targetIndex > currentIndex) {
          for (let i = currentIndex + 1; i < targetIndex; i++) {
            visibleFields.delete(sortedFields[i].identifier);
          }
        }
      }

      if (rule.action === "show_values" && conditionsMet) {
        const existing = filteredChoices[rule.target_identifier] ?? [];
        const combined = new Set([...existing, ...rule.conditions.flatMap((c) => c.values)]);
        filteredChoices[rule.target_identifier] = Array.from(combined);
      }
    }
  }

  return { visibleFields, filteredChoices };
}

/**
 * React hook that computes field visibility and filtered choices
 * whenever form values change. Calls the provided callbacks to
 * update the form state.
 */
export function useConditionalLogic(
  fields: CmpFormField[],
  values: Record<string, unknown>,
  onVisibilityChange: (visibleFields: Set<string>) => void,
  onFilteredChoicesChange: (field: string, choiceIds: string[]) => void
): void {
  const prevResultRef = useRef<ConditionalLogicResult | null>(null);

  const compute = useCallback(() => {
    const result = computeConditionalLogic(fields, values);

    const prev = prevResultRef.current;
    if (prev) {
      const sameVisibility =
        prev.visibleFields.size === result.visibleFields.size &&
        [...prev.visibleFields].every((id) => result.visibleFields.has(id));

      if (!sameVisibility) {
        onVisibilityChange(result.visibleFields);
      }

      const allChoiceKeys = new Set([
        ...Object.keys(prev.filteredChoices),
        ...Object.keys(result.filteredChoices),
      ]);

      for (const key of allChoiceKeys) {
        const prevIds = prev.filteredChoices[key] ?? [];
        const nextIds = result.filteredChoices[key] ?? [];
        if (
          prevIds.length !== nextIds.length ||
          !prevIds.every((id, i) => nextIds[i] === id)
        ) {
          onFilteredChoicesChange(key, nextIds);
        }
      }
    } else {
      onVisibilityChange(result.visibleFields);
      for (const [key, ids] of Object.entries(result.filteredChoices)) {
        onFilteredChoicesChange(key, ids);
      }
    }

    prevResultRef.current = result;
  }, [fields, values, onVisibilityChange, onFilteredChoicesChange]);

  useEffect(() => {
    compute();
  }, [compute]);
}
