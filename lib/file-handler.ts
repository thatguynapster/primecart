import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { ID, db, storage } from "./appwrite";

const bucket_id = (bucket: "business" | "product" | "media") => {
  switch (bucket) {
    case "business":
      return process.env.NEXT_PUBLIC_APPWRITE_BUSINESS_BUCKET_ID!;

    case "product":
      return process.env.NEXT_PUBLIC_APPWRITE_PRODUCTS_BUCKET_ID!;

    default:
      return process.env.NEXT_PUBLIC_APPWRITE_MEDIA_BUCKET_ID!;
  }
};

export const uploadFile = async ({
  bucket,
  file,
}: {
  bucket: "business" | "product" | "media";
  file: File;
}) => {
  try {
    const upload = await storage
      .createFile(bucket_id(bucket), ID.unique(), file)
      .then(
        (response) => response,
        (error) => {
          throw new Error(error);
        }
      );

    return {
      file_id: upload.$id,
      href: storage.getFilePreview(bucket_id(bucket), upload.$id).href,
    };
  } catch (error) {
    console.log(error);
    throw new Error("Failed to upload file");
  }
};

export const removeFile = async ({
  bucket,
  file_id,
}: {
  bucket: "business" | "product" | "media";
  file_id: string;
}) => {
  try {
    const response = await storage.deleteFile(bucket_id(bucket), file_id);
    return;
  } catch (error) {
    throw new Error("Failed to delete image");
  }
};
