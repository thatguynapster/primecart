"use client";

import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { classNames } from "@/lib/utils";
import { PlusIcon, Trash2 } from "lucide-react";
import { FormikHelpers } from "formik";
import Spinner from "./icons/spinner";

type UploadProps = {
  value: string;
  name: string;
  type: "image" | "pdf";
  withFormik?: boolean;
  deleteFile: () => void;
  onValueChanged: (value: File) => void;
} & Pick<FormikHelpers<any>, "setFieldTouched">;

const SingleFileUpload = ({
  name,
  type,
  value,
  onValueChanged,
  setFieldTouched,
  deleteFile,
  withFormik = true,
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
  }, [value]);

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
              setFieldTouched(name, true);
              imageRef.current.value = "";
            });
          }
        }}
      />
      <div
        className={classNames(
          "w-full border-2 p-4 rounded-lg",
          "bg-light border-dark",
          "dark:bg-dark dark:border-light",
          "flex flex-col items-center justify-center gap-5"
        )}
      >
        <div
          className={classNames(
            "relative w-20 h-20 border-2 border-dashed rounded-xl",
            "flex items-center justify-center group",
            "bg-light border-dark",
            "dark:bg-dark dark:border-light"
          )}
        >
          {value ? (
            <Image
              src={value}
              className="rounded-xl"
              alt="Business Logo"
              fill
              sizes="(max-width: 1200px) 100vw, (max-width: 768px) 50vw, 33vw"
            />
          ) : (
            <>
              {!value && uploading ? (
                <Spinner className="w-5 h-5 text-dark dark:text-light" />
              ) : (
                <PlusIcon size={24} className="text-dark dark:text-light" />
              )}
            </>
          )}

          {value && (
            <div
              className={classNames(
                "hidden group-hover:block cursor-pointer",
                "absolute right-0 top-0 text-error p-1 rounded-tr-xl rounded-bl-xl"
              )}
              onClick={deleteFile}
            >
              <Trash2 className="bg-white w-4 h-4" />
            </div>
          )}
        </div>

        {!value && (
          <p
            className="text-sm text-info text-center cursor-pointer"
            onClick={() => imageRef.current.click()}
          >
            Select File
          </p>
        )}
      </div>
    </>
  );
};

export default SingleFileUpload;
