"use client";
import React, { useEffect } from "react";

import { EditorContent, useEditor } from "@tiptap/react";
import Placeholder from '@tiptap/extension-placeholder';
import TextStyle from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import ListItem from "@tiptap/extension-list-item";
import { Color } from "@tiptap/extension-color";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";

import { MenuBar } from "./menu";
import "./styles.scss";

interface TextEditorProps {
  content?: string;
  placeholder?: string;
  onChange: (data: string) => void;
}

export const TextEditor = ({ content, placeholder, onChange }: TextEditorProps) => {

  const editor = useEditor({
    extensions: [
      Image.configure({ inline: true, allowBase64: true }),
      // ImageResize,
      TextAlign.configure({
        types: ["paragraph"],
      }),
      Highlight,
      Color.configure({ types: [TextStyle.name, ListItem.name] }),
      StarterKit,
      // Heading.configure({
      //   levels: [1],
      // }),
      Placeholder.configure({
        placeholder: placeholder,
      }),
    ],
    content: content,
    immediatelyRender: false,
  });

  useEffect(() => {
    editor?.on("update", () => {
      onChange(editor.getHTML());
    });
  }, [editor]);

  return (
    <div className="flex flex-col w-full border-2 rounded-lg divide-y-2 divide-dark">
      <MenuBar {...{ editor }} />
      <div className="p-4">
        <EditorContent {...{ editor }} />
      </div>
    </div>
  );
};
