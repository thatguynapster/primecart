"use client";

import { useState } from "react";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { CheckIcon } from "@heroicons/react/20/solid";
import { ChevronsUpDownIcon } from "lucide-react";
import { classNames } from "@/lib/helpers";

export type SelectOptions = { label: string; value: string };
type Props = {
  addNew?: { text: string; action: () => void };
  onChange: (option: SelectOptions) => void;
  options: SelectOptions[];
  placeholder: string;
  value: string;
  // defaultValue: string;
};

export default function Select({
  addNew,
  onChange,
  options,
  placeholder,
  value,
}: // defaultValue,
Props) {
  const [selected, setSelected] = useState(
    options.find((option) => option.value === value)
    // ?? options.find((option) => option.value === defaultValue)
  );

  return (
    <Listbox value={selected} onChange={setSelected}>
      <div className="relative">
        <ListboxButton
          className={classNames(
            "relative w-full cursor-default px-3.5 py-2.5 text-left text-sm",
            "bg-light dark:bg-dark",
            "border-b-2"
          )}
        >
          <span className="block truncate">
            {selected?.label ?? placeholder}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronsUpDownIcon aria-hidden="true" className="h-5 w-5" />
          </span>
        </ListboxButton>

        <ListboxOptions
          transition
          className={classNames(
            "data-[closed]:data-[leave]:opacity-0 data-[leave]:transition data-[leave]:duration-100 data-[leave]:ease-in sm:text-sm",
            "mt-1 max-h-60 w-full overflow-auto",
            "absolute z-10",
            "bg-light dark:bg-dark",
            "border-2 rounded-lg"
          )}
        >
          {options.map((option) => (
            <ListboxOption
              key={option.value}
              value={option}
              className={classNames(
                "group relative cursor-default select-none",
                "py-2 pl-8 pr-4",
                "data-[focus]:text-light dark:data-[focus]:text-dark",
                "data-[focus]:bg-dark dark:data-[focus]:bg-light"
              )}
              onClick={() => {
                onChange(option);
              }}
            >
              <span className="block truncate font-normal group-data-[selected]:font-semibold">
                {option.label}
              </span>

              <span
                className={classNames(
                  "absolute inset-y-0 left-0",
                  "flex items-center pl-1.5",
                  "group-data-[focus]:text-light dark:group-data-[focus]:text-dark",
                  "[.group:not([data-selected])_&]:hidden"
                )}
              >
                <CheckIcon aria-hidden="true" className="h-5 w-5" />
              </span>
            </ListboxOption>
          ))}

          {addNew && (
            <ListboxOption
              value={"new"}
              className={classNames(
                "group relative cursor-default select-none",
                "py-2 pl-8 pr-4",
                "data-[focus]:text-light dark:data-[focus]:text-dark",
                "cursor-pointer"
              )}
              onClick={addNew.action}
            >
              <span
                className={classNames(
                  "block truncate font-normal group-data-[selected]:font-semibold",
                  "text-blue-600 font-semibold"
                )}
              >
                {addNew.text ?? "Add New"}
              </span>
            </ListboxOption>
          )}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
