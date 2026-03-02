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

  const sanitizedFilename = filename
    .replace(/\.[^/.]+$/, "") // remove extension
    .replace(/\s+/g, "_"); // replace spaces with underscores

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "orders",
        public_id: `${Date.now()}-${sanitizedFilename}`,
        resource_type: "auto", // auto-detects image, PDF, video, etc.
        access_mode: "public",
        type: "upload",
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error("No result from Cloudinary"));
        resolve({
          url: result.secure_url,
          resource_type: result.resource_type, // "image" or "raw"
        });
      },
    );
    stream.end(fileBuffer);
  });
}
