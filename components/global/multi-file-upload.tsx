"use client";

import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { classNames } from "@/lib/utils";
import {
  Ellipsis,
  EllipsisVertical,
  Eye,
  PlusIcon,
  Trash2,
} from "lucide-react";
import { FormikHelpers } from "formik";
import Spinner from "./icons/spinner";
import clsx from "clsx";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";

type UploadProps = {
  files: { file_id: string; href: string }[];
  name: string;
  limit?: number;
  type: "image" | "pdf";
  deleteFile: (id: string) => void;
  makeThumbnail: (id: string) => void;
  onValueChanged: (value: File) => void;
};

const MultipleFileUpload = ({
  name,
  type,
  files,
  limit = 5,
  onValueChanged,
  deleteFile,
  makeThumbnail,
}: UploadProps) => {
  /**
   * refs
   */
  const imageRef = useRef<any>();

  /**
   * variables
   */
  const [uploading, setUploading] = useState(false);
  const format: string[] = (() => {
    const format = [];

    if (type === "image") {
      format.push(["image/jpg", "image/jpeg", "image/png", "image/webp"]);
    }

    if (type === "pdf") {
      format.push(["application/pdf"]);
    }

    return format.flat();
  })();

  useEffect(() => {
    setUploading(false);

    return () => {};
  }, [files]);

  return (
    <>
      <input
        name={name}
        type="file"
        ref={imageRef}
        className="hidden"
        accept={format.join(", ")}
        onChange={({ currentTarget: { files } }) => {
          if (files?.[0]) {
            onValueChanged(files[0]);
            setUploading(true);
            setTimeout(() => {
              imageRef.current.value = "";
            });
          }
        }}
      />
      <div
        className={classNames(
          "w-full border-2 p-2 rounded-lg",
          "bg-light border-dark",
          "dark:bg-dark dark:border-light",
          "flex flex-wrap items-center gap-5"
        )}
      >
        {/* <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center"> */}
        {/* <div className="flex flex-wrap gap-4 items-center"> */}
        {files.length < limit && (
          <div
            className={clsx(
              "relative w-20 h-20 border-2 border-dashed rounded-xl",
              "flex items-center justify-center group",
              "bg-light border-dark",
              "dark:bg-dark dark:border-light",
              { "cursor-pointer": !uploading }
            )}
            onClick={() => !uploading && imageRef.current.click()}
          >
            {uploading ? (
              <Spinner className="w-5 h-5 text-dark dark:text-light" />
            ) : (
              <PlusIcon size={24} className="text-dark dark:text-light" />
            )}
          </div>
        )}

        {!files.length && (
          <div className="w-20 text-center">
            <p
              className="text-sm text-info text-center cursor-pointer"
              onClick={() => imageRef.current.click()}
            >
              Select File
            </p>
            <em className="text-sm">Max {limit} images</em>
          </div>
        )}

        {files.length > 0 &&
          files?.map(({ file_id, href }) => (
            <div
              key={file_id}
              className={classNames(
                "relative w-20 h-20 border-2 rounded-xl group"
              )}
            >
              <Image
                src={href}
                alt={`uploaded file ${file_id}`}
                fill
                sizes="(max-width: 1200px) 100vw, (max-width: 768px) 50vw, 33vw"
                className="rounded-lg object-cover object-center"
              />

              <div
                className={classNames(
                  "hidden group-hover:block",
                  "absolute right-0 top-0"
                )}
              >
                <Menu as="div" className="relative">
                  <MenuButton
                    className={
                      "relative flex items-center justify-center rounded-lg border-2 w-8 h-8 text-sm focus:outline-none bg-light dark:bg-dark"
                    }
                  >
                    <EllipsisVertical
                      size={16}
                      className="rotate-0 scale-100 transition-all"
                    />

                    <span className="sr-only">Image Options</span>
                  </MenuButton>

                  <MenuItems
                    transition
                    className={classNames(
                      "absolute right-0 top-0 z-10 mt-3 w-max origin-top-left rounded-md py-1 border-2 focus:outline-none data-[closed]:data-[leave]:scale-95 data-[closed]:data-[leave]:transform data-[closed]:data-[leave]:opacity-0 data-[leave]:transition data-[leave]:duration-75 data-[leave]:ease-in",
                      "bg-light text-dark border-dark",
                      "dark:bg-dark dark:text-light dark:border-light",
                      "group"
                    )}
                  >
                    <MenuItem>
                      <div
                        className={classNames(
                          "px-4 py-2 cursor-pointer text-sm",
                          "hover:bg-dark hover:text-light",
                          "hover:dark:bg-light hover:dark:text-dark",
                          "flex items-center gap-4"
                        )}
                        onClick={() => {
                          makeThumbnail(file_id);
                        }}
                      >
                        <Eye size={16} />
                        <span>Make Thumbnail</span>
                      </div>
                    </MenuItem>
                    <MenuItem>
                      <div
                        className={classNames(
                          "px-4 py-2 cursor-pointer text-sm",
                          "hover:bg-error hover:text-light",

                          "flex items-center gap-4"
                        )}
                        onClick={() => {
                          deleteFile(file_id);
                        }}
                      >
                        <Trash2 size={16} />
                        <span>Delete</span>
                      </div>
                    </MenuItem>
                  </MenuItems>
                </Menu>
              </div>
            </div>
          ))}
        {/* </div> */}
      </div>
    </>
  );
};

export default MultipleFileUpload;
