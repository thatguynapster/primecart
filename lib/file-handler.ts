import { ID, storage } from "./appwrite";
import { Bucket } from "./types";

const bucket_id = (bucket: Bucket) => {
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
  bucket: Bucket;
  file_id: string;
}) => {
  try {
    const response = await storage.deleteFile(bucket_id(bucket), file_id);
    return;
  } catch (error) {
    throw new Error("Failed to delete image");
  }
};

export const handleImageUpload = async (file: File, bucket: Bucket) => {
  const response = await uploadFile({
    bucket,
    file,
  });
  return response;
};

export const deleteFile = async (logoID: string, bucket: Bucket) => {
  await removeFile({
    bucket,
    file_id: logoID!,
  });
};
