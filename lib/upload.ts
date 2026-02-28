import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function uploadToCloudinary(
  fileBuffer: Buffer,
  filename: string,
): Promise<string> {
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

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "orders",
        public_id: `${Date.now()}-${filename.replace(/\.[^/.]+$/, "")}`,
        resource_type: "auto",
        access_mode: "public", // ← add this
        type: "upload", // ← add this
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error("No result from Cloudinary"));
        resolve(result.secure_url);
      },
    );
    stream.end(fileBuffer);
  });
}
