"use client";

import { classNames } from "@/lib/helpers";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import SingleFileUpload from "../global/single-file-upload";
import MultipleFileUpload from "../global/multi-file-upload";
import { deleteFile, handleImageUpload } from "@/lib/file-handler";
import toast from "react-hot-toast";
import ThemedImage from "../site/logo";

type Props = { images?: string[]; onUpdate: (images: string[]) => void };

const ProductImages = ({ images, onUpdate }: Props) => {
  const uploadedImages = images?.map((img) => ({
    file_id: img.split("/files/")[1].split("/")[0],
    href: img,
  }));

  const [_images, setImages] = useState<{ file_id: string; href: string }[]>(
    uploadedImages ?? []
  );

  useEffect(() => {
    onUpdate(_images.map((img) => img.href));
  }, [_images]);

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
        {images?.length ? (
          <Image
            src={_images[0]?.href ?? "/img/logo.png"}
            alt={"Product Thumbnail"}
            priority
            fill
            // width={306}
            // height={306}
            sizes="(max-width: 1200px) 100vw, (max-width: 768px) 50vw, 33vw"
            className="object-cover object-center aspect-square rounded-lg"
          />
        ) : (
          <ThemedImage size={306} />
        )}
      </div>

      <MultipleFileUpload
        files={_images}
        name="images"
        type={"image"}
        onValueChanged={async (file: File) => {
          const uploaded_file = await handleImageUpload(file, "product");

          setImages((prev) => {
            return [...prev, uploaded_file];
          });
        }}
        makeThumbnail={async (id: string) => {
          const img = _images.find((img) => img.file_id === id);

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
            return _images.filter((img) => img.file_id !== id).filter(Boolean);
          });

          toast("File deleted");
        }}
      />
    </div>
  );
};

export default ProductImages;
