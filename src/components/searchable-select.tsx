"use client";

import { useState } from "react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

export type SelectOption = { value: string; label: string };

/**
 * A searchable single-select (type to filter). Works in forms via a hidden
 * input (`name`), or controlled via `value` / `onValueChange`.
 */
export function SearchableSelect({
  options,
  name,
  id,
  defaultValue,
  value,
  onValueChange,
  placeholder = "Select…",
  emptyText = "No matches.",
  className,
  disabled,
}: {
  options: SelectOption[];
  name?: string;
  id?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [internal, setInternal] = useState(defaultValue ?? "");
  const current = value ?? internal;
  const selected = options.find((o) => o.value === current) ?? null;

  return (
    <Combobox
      items={options}
      value={selected}
      onValueChange={(item: SelectOption | null) => {
        const next = item ? item.value : "";
        onValueChange?.(next);
        if (value === undefined) setInternal(next);
      }}
      itemToStringLabel={(item: SelectOption) => item.label}
      isItemEqualToValue={(a: SelectOption, b: SelectOption) => a.value === b.value}
    >
      {name && <input type="hidden" name={name} value={current} />}
      <ComboboxInput
        id={id}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
      />
      <ComboboxContent>
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(item: SelectOption) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
