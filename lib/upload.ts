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
    .replace(/\.[^/.]+$/, "") // remove extension
    .replace(/\s+/g, "_") // replace spaces with underscores
    .replace(/[^a-zA-Z0-9_\-]/g, "_"); // replace ALL other special chars (commas, etc.) with underscore

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "orders",
        public_id: `${Date.now()}-${sanitizedFilename}`,
        resource_type: isPdf ? "raw" : "image",
        access_mode: "public",
        type: "upload",
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error("No result from Cloudinary"));

        let url = result.secure_url;

        // Safety net: if PDF but Cloudinary still returned /image/upload/, fix it
        if (isPdf && url.includes("/image/upload/")) {
          url = url.replace("/image/upload/", "/raw/upload/");
        }

        // Force inline display (open in browser instead of downloading)
        if (isPdf) {
          url = url.replace("/raw/upload/", "/raw/upload/fl_attachment:false/");
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
