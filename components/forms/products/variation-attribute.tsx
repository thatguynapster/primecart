"use client";

import { Trash2 } from "lucide-react";
import React from "react";

import { classNames } from "@/lib/helpers";

type Props = {
  data: { key: string; value: string };
  onRemove: (key: string) => void;
};

const VariationAttribute = ({ data: { key, value }, onRemove }: Props) => {
  return (
    <div className="relative px-8 py-2 group">
      <span>
        {key} / {value}
      </span>

      <div
        className={classNames(
          "absolute right-1 top-1",
          "bg-dark dark:bg-light",
          "rounded-lg",
          "text-light dark:text-dark",
          "hidden group-hover:flex"
        )}
      >
        <div
          className="p-2 cursor-pointer bg-error rounded-lg"
          onClick={() => {
            onRemove(key);
          }}
        >
          <Trash2 size={16} />
        </div>
      </div>
    </div>
  );
};

export default VariationAttribute;
