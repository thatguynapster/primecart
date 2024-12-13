import { revalidatePath } from "next/cache";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Initialize S3 Client
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env["NEXT_PUBLIC_AWS_S3_ACCESS_KEY_ID"]!,
    secretAccessKey: process.env["NEXT_PUBLIC_AWS_S3_SECRET_ACCESS_KEY"]!,
  },
  region: process.env["NEXT_PUBLIC_AWS_S3_REGION"]!,
});

async function uploadFileToS3({
  buffer,
  key,
  type,
}: {
  buffer: Buffer;
  key: string;
  type: string;
}) {
  try {
    // Prepare the upload command
    const params = {
      Bucket: process.env["NEXT_PUBLIC_AWS_S3_BUCKET_NAME"]!,
      Key: key,
      Body: buffer,
      // ACL: "public-read" as ObjectCannedACL,
      ContentType: type,
    };

    const command = new PutObjectCommand(params);

    // Upload the file
    await s3.send(command);

    // Construct the public URL (if bucket is public)
    const publicUrl = `https://${process.env[
      "NEXT_PUBLIC_AWS_S3_BUCKET_NAME"
    ]!}.s3.${process.env["NEXT_PUBLIC_AWS_S3_REGION"]!}.amazonaws.com/${key}`;

    console.log("File uploaded successfully:", publicUrl);
    return publicUrl;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
}

export const uploadFile = async (
  file: File,
  folder: "business" | "products" | "media" | "categories",
  ref?: string
) => {
  try {
    console.log(file);

    if (file.size === 0) {
      return { status: "error", message: "Please select a file" };
    }

    const extension = `.${file.name.split(".").pop()}`;
    const key = `${folder}/${file.name}-${Date.now()}${extension}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const url = await uploadFileToS3({ buffer, key, type: file.type });

    ref && revalidatePath(ref, "page");
    return { status: "success", message: "File has been uploaded", url };
  } catch (error) {
    return { status: "error", message: "Failed to upload file" };
  }
};
