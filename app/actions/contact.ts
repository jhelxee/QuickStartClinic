"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/dal";
import { emailShell, sendEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { contactSchema } from "@/lib/validation";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

/**
 * Submit a contact-form message.
 *
 * Deliberately public — no requireUser() — since the whole point is to reach
 * visitors who don't have an account. Still re-validates with the same Zod
 * schema the form used: this is a POST endpoint anyone can call directly,
 * same reasoning as every other Server Action here.
 */
export async function submitInquiry(values: unknown): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Please check the form and try again." };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("contact_inquiries").insert({
    name: v.name,
    email: v.email,
    phone: v.phone?.trim() ? v.phone : null,
    message: v.message,
  });

  if (error) {
    return { error: "We couldn't send your message. Please try again." };
  }

  // Optional — only fires if a clinic inbox is configured. Staff can always
  // see new messages on the Messages page regardless, so this is a
  // nice-to-have notification, not the delivery mechanism.
  const notifyAddress = process.env.CLINIC_NOTIFY_EMAIL;
  if (notifyAddress) {
    await sendEmail({
      to: notifyAddress,
      subject: "New message from the website",
      html: emailShell(
        "New contact form message",
        `<p style="margin:0 0 12px;color:#334155;line-height:1.6;"><strong>${v.name}</strong> (${v.email}${v.phone ? `, ${v.phone}` : ""}) sent a message:</p>
         <p style="margin:0;padding:16px;background:#f4f9fb;border-radius:12px;color:#0b2a4a;white-space:pre-wrap;">${v.message}</p>`
      ),
    });
  }

  return { success: true };
}

/**
 * Mark a message read or archived.
 *
 * Staff and doctors can do this, same as everything else operational on
 * /admin — this isn't admin-only the way Master Data is.
 */
export async function updateInquiryStatus(
  id: string,
  status: "new" | "read" | "archived"
): Promise<ActionResult> {
  await requireStaff();

  const supabase = await createClient();
  const { error } = await supabase
    .from("contact_inquiries")
    .update({ status })
    .eq("id", id);

  if (error) {
    return { error: "Couldn't update that message." };
  }

  revalidatePath("/admin/inquiries");
  revalidatePath("/admin");
  return { success: true };
}
