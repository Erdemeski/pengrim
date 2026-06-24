import { z } from "zod";
import { REQUEST_TYPES } from "./constants";

type Translate = (key: string) => string;

/**
 * Tek kaynak: client çevrilmiş mesajlarla, server ise anahtarla kurar.
 * Aynı kurallar her iki tarafta da geçerlidir.
 */
export function buildContactSchema(t: Translate) {
  return z.object({
    name: z.string().trim().min(2, t("nameMin")),
    company: z.string().trim().min(2, t("companyMin")),
    email: z.string().trim().min(1, t("email")).email(t("email")),
    phone: z.string().trim().min(7, t("phoneMin")),
    requestType: z
      .string()
      .refine((v) => (REQUEST_TYPES as readonly string[]).includes(v), {
        message: t("requestType"),
      }),
    // boş bırakılabilir (opsiyonel alanlar) — input/output tipi tutarlı kalsın
    league: z.string().trim().max(120),
    budget: z.string().trim().max(40),
    message: z.string().trim().min(10, t("messageMin")).max(2000),
  });
}

/** Server-side şema (mesajlar anahtar olarak döner; kullanıcıya gösterilmez). */
export const contactSchema = buildContactSchema((k) => k);
export type ContactInput = z.infer<typeof contactSchema>;
