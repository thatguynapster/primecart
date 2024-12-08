"use client";

import React, { useEffect, useState } from "react";
import { uploadFile } from "@/lib/s3-upload";
import { classNames } from "@/lib/utils";
import toast from "react-hot-toast";
import Image from "next/image";

import MultipleFileUpload from "../global/multi-file-upload";
import ThemedImage from "../site/logo";

type Props = { images?: string[]; onUpdate: (images: string[]) => void };

const ProductImages = ({ images, onUpdate }: Props) => {
  const [_images, setImages] = useState<string[]>(
    images ?? []
  );

  useEffect(() => {
    onUpdate(_images);
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
        {_images?.length ? (
          <Image
            src={_images[0] ?? "/img/logo.png"}
            alt={"Product Thumbnail"}
            priority
            fill
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
          const uploaded_file = await uploadFile(file, "products");
          if (uploaded_file.url) {
            setImages((prev) => {
              return [...prev, uploaded_file.url];
            });
          }

        }}
        makeThumbnail={async (id: string) => {
          setImages((prev) => {
            return [
              ...prev.sort((a, b) =>
                a === id ? -1 : b === id ? 1 : 0
              ),
            ];
          });
        }}
        deleteFile={async (id: string) => {
          setImages(() => {
            return _images.filter((img) => img !== id).filter(Boolean);
          });

          toast("File deleted");
        }}
      />
    </div>
  );
};

export default ProductImages;
