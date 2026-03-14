import { v2 as cloudinary } from "cloudinary";

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

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

  const publicId = `${Date.now()}-${sanitizedFilename}`;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "orders",
        public_id: publicId,
        // ✅ KEY FIX: PDFs must use resource_type "image" — NOT "raw"
        // "raw" requires signed URLs (causes 401). "image" with format "pdf"
        // is publicly accessible and also generates a preview in Cloudinary.
        resource_type: "image",
        ...(isPdf && { format: "pdf" }),
        type: "upload",
        access_mode: "public",
        invalidate: true,
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error("No result from Cloudinary"));

        const url = result.secure_url;
        // resource_type is "image" for both images and PDFs now
        resolve({
          url,
          resource_type: result.resource_type || "image",
        });
      },
    );

    stream.end(fileBuffer);
  });
}
