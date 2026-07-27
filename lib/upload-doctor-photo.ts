import { createClient } from "@/lib/supabase/client";

/**
 * Uploads a doctor's photo straight from the browser to the `doctor-photos`
 * Storage bucket, then returns its public URL to save on the doctor record.
 *
 * Direct client-to-Storage rather than routing the file through a Server
 * Action — Storage RLS (admin-only write, see migration 14) is the real
 * gate here, the same "RLS is the boundary" pattern this project uses
 * everywhere else, just applied to file uploads instead of table rows.
 */

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Returns an error message if the file isn't acceptable, null if it's fine. */
export function validateDoctorPhoto(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Please choose a JPEG, PNG, or WebP image.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "Image must be under 5MB.";
  }
  return null;
}

export async function uploadDoctorPhoto(file: File): Promise<string> {
  const supabase = createClient();
  const extension = file.name.split(".").pop() ?? "jpg";
  // Random, not the original filename — avoids collisions between two
  // doctors' photos both happening to be named "headshot.jpg".
  const path = `${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from("doctor-photos")
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) {
    throw new Error("Could not upload photo. Please try again.");
  }

  const { data } = supabase.storage.from("doctor-photos").getPublicUrl(path);
  return data.publicUrl;
}
