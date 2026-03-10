import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export interface UploadResult {
  url: string;
  resource_type: string;
}

export async function uploadToCloudinary(
  fileBuffer: Buffer,
  filename: string,
): Promise<UploadResult> {
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error("Empty file buffer");
  }

  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error("Cloudinary environment variables are not set");
  }

  const isPdf = filename.toLowerCase().endsWith(".pdf");

  const sanitizedFilename = filename
    .replace(/\.[^/.]+$/, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_\-]/g, "_");

  const publicId = `${Date.now()}-${sanitizedFilename}${isPdf ? ".pdf" : ""}`;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "orders",
        public_id: publicId,
        resource_type: isPdf ? "raw" : "image",
        ...(isPdf && { format: "pdf" }),
        access_mode: "public",
        type: "upload",
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error("No result from Cloudinary"));

        let url = result.secure_url;

        if (isPdf && url.includes("/image/upload/")) {
          url = url.replace("/image/upload/", "/raw/upload/");
        }

        if (isPdf && !url.toLowerCase().endsWith(".pdf")) {
          url = url + ".pdf";
        }

        resolve({
          url,
          resource_type: isPdf ? "raw" : "image",
        });
      },
    );

    stream.end(fileBuffer);
  });
}
