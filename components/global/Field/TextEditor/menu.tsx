import { Editor } from "@tiptap/react";
import React from "react";

import {
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  BulletListIcon,
  ItalicIcon,
  NumberListIcon,
  RedoIcon,
  StrikeThroughIcon,
  UndoIcon,
} from "./icons";
import { Button } from "../../button";
import { classNames } from "@/lib/helpers";

export const MenuBar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex justify-between gap-12 p-4 overflow-auto">
      <div className="flex gap-12">
        <div className="flex gap-6">
          <Button
            variant="outline"
            className={classNames(
              "!p-0 border-transparent dark:border-transparent",
              editor.isActive("bold") ? "bg-neutral-30" : ""
            )}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <BoldIcon size={24} />
          </Button>

          <Button
            variant="outline"
            className={classNames(
              "!p-0 border-transparent dark:border-transparent",
              editor.isActive("italic") ? "bg-neutral-30" : ""
            )}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <ItalicIcon size={20} />
          </Button>

          <Button
            variant="outline"
            className={classNames(
              "!p-0 border-transparent dark:border-transparent",
              editor.isActive("strike") ? "bg-neutral-30" : ""
            )}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <StrikeThroughIcon size={20} />
          </Button>
        </div>

        <div className="flex gap-6">
          <Button
            variant="outline"
            className={classNames(
              "!p-0 border-transparent dark:border-transparent",
              editor.isActive({ textAlign: "left" })
                ? "bg-neutral-30 dark:bg-transparent dark:border-neutral-10"
                : ""
            )}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
          >
            <AlignLeftIcon size={20} />
          </Button>

          <Button
            variant="outline"
            className={classNames(
              "!p-0 border-transparent dark:border-transparent",
              editor.isActive({ textAlign: "center" }) ? "bg-neutral-30" : ""
            )}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
          >
            <AlignCenterIcon size={20} />
          </Button>

          <Button
            variant="outline"
            className={classNames(
              "!p-0 border-transparent dark:border-transparent",
              editor.isActive({ textAlign: "right" }) ? "bg-neutral-30" : ""
            )}
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
          >
            <AlignRightIcon size={20} />
          </Button>

          <Button
            variant="outline"
            className={classNames(
              "!p-0 border-transparent dark:border-transparent",
              editor.isActive({ textAlign: "justify" }) ? "bg-neutral-30" : ""
            )}
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          >
            <AlignJustifyIcon size={20} />
          </Button>
        </div>

        <div className="flex gap-6">
          <Button
            variant="outline"
            className={classNames(
              "!p-0 border-transparent dark:border-transparent",
              editor.isActive("bulletList") ? "bg-neutral-30" : ""
            )}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <BulletListIcon size={20} />
          </Button>

          <Button
            variant="outline"
            className={classNames(
              "!p-0 border-transparent dark:border-transparent",
              editor.isActive("orderedList") ? "bg-neutral-30" : ""
            )}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <NumberListIcon size={24} />
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        <Button
          variant="outline"
          className={classNames(
            "!p-0 border-transparent dark:border-transparent",
            "disabled:text-neutral-40"
          )}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
        >
          <UndoIcon size={20} />
        </Button>

        <Button
          variant="outline"
          className={classNames(
            "!p-0 border-transparent dark:border-transparent",
            "disabled:text-neutral-40"
          )}
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
        >
          <RedoIcon size={20} />
        </Button>
      </div>
    </div>
  );
};
