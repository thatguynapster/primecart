"use client";

import { classNames } from "@/lib/helpers";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import SingleFileUpload from "../global/single-file-upload";
import MultipleFileUpload from "../global/multi-file-upload";
import { deleteFile, handleImageUpload } from "@/lib/file-handler";
import toast from "react-hot-toast";

type Props = { onUpdate: (images: string[]) => void };

const ProductImages = ({ onUpdate }: Props) => {
  const [images, setImages] = useState<{ file_id: string; href: string }[]>([]);

  useEffect(() => {
    onUpdate(images.map((img) => img.href));
  }, [images]);

  return (
    <div
      className={classNames(
        "flex flex-col",
        "gap-4 p-6",
        "rounded-lg border-2",
        "lg:max-w-[22.125rem] w-full h-max"
      )}
    >
      <div
        className={classNames(
          "lg:max-w-[306px] aspect-square",
          "border rounded-lg",
          "bg-light dark:bg-dark",
          "relative"
        )}
      >
        <Image
          src={images[0]?.href ?? "/img/logo.png"}
          alt={"Product Thumbnail"}
          priority
          fill
          // width={306}
          // height={306}
          sizes="(max-width: 1200px) 100vw, (max-width: 768px) 50vw, 33vw"
          className="object-cover object-center aspect-square rounded-lg"
        />
      </div>

      <MultipleFileUpload
        files={images}
        name="images"
        type={"image"}
        onValueChanged={async (file: File) => {
          const uploaded_file = await handleImageUpload(file, "product");

          setImages((prev) => {
            return [...prev, uploaded_file];
          });
        }}
        makeThumbnail={async (id: string) => {
          const img = images.find((img) => img.file_id === id);

          setImages((prev) => {
            return [
              ...prev.sort((a, b) =>
                a.file_id === id ? -1 : b.file_id === id ? 1 : 0
              ),
            ];
          });
        }}
        deleteFile={async (id: string) => {
          await deleteFile(id, "product");

          setImages(() => {
            return images.filter((img) => img.file_id !== id).filter(Boolean);
          });

          toast("File deleted");
        }}
      />
    </div>
  );
};

export default ProductImages;
