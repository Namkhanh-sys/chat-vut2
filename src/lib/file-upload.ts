import { supabase } from "@/integrations/supabase/client";

export interface UploadProgress {
  progress: number;
  status: "uploading" | "completed" | "error";
  error?: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB for better video support
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg"];
const ALLOWED_FILE_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, "application/pdf", "application/msword", "text/plain"];

export async function uploadFile(
  file: File,
  userId: string,
  onProgress?: (prog: UploadProgress) => void
): Promise<{ publicUrl: string; filename: string; mimeType: string; sizeBytes: number } | null> {
  try {
    // Validation
    if (file.size > MAX_FILE_SIZE) {
      onProgress?.({ progress: 0, status: "error", error: `File quá lớn. Tối đa ${MAX_FILE_SIZE / 1024 / 1024}MB` });
      return null;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      onProgress?.({ progress: 0, status: "error", error: "Loại file không được phép" });
      return null;
    }

    // Prepare upload path
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_").toLowerCase();
    const path = `${userId}/${timestamp}-${safeName}`;

    onProgress?.({ progress: 10, status: "uploading" });

    // Upload to Supabase Storage
    let bucket = "message-files";
    if (ALLOWED_IMAGE_TYPES.includes(file.type)) bucket = "message-images";
    else if (ALLOWED_VIDEO_TYPES.includes(file.type)) bucket = "message-videos";

    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file);

    if (uploadError) {
      onProgress?.({ progress: 0, status: "error", error: uploadError.message });
      return null;
    }

    onProgress?.({ progress: 90, status: "uploading" });

    // Get public URL
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);

    onProgress?.({ progress: 100, status: "completed" });

    return {
      publicUrl: urlData.publicUrl,
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    onProgress?.({ progress: 0, status: "error", error: message });
    return null;
  }
}

export function isImageFile(mimeType: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(mimeType);
}

export function isVideoFile(mimeType: string): boolean {
  return ALLOWED_VIDEO_TYPES.includes(mimeType);
}

export function getFileIcon(mimeType: string): string {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return "📷";
  if (ALLOWED_VIDEO_TYPES.includes(mimeType)) return "🎥";
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.includes("word")) return "📝";
  return "📎";
}
