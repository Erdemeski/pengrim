import { NextResponse } from "next/server";
import { contactSchema } from "@/lib/validations";

/**
 * STUB iletişim endpoint'i.
 * Talebi zod ile doğrular, server log'una yazar ve { ok: true } döner.
 * Gerçek e-posta / CRM entegrasyonu (örn. Resend) buraya bağlanacak.
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const parsed = contactSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "validation", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  // TODO: e-posta gönderimi / CRM kaydı burada yapılacak.
  console.log("[contact] yeni talep:", {
    ...parsed.data,
    receivedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
