import "server-only";

// Sending the weekly guide.
//
// Resend, over plain fetch rather than their SDK: one POST with a JSON body is
// not worth a dependency. Everything is read from the environment so a missing
// key is a clear, reported skip rather than a crash on a Tuesday morning.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface SendResult {
  sent: boolean;
  reason?: string;
  id?: string;
}

export async function sendEmail(
  subject: string,
  html: string,
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.FAAB_EMAIL_TO;
  const from = process.env.FAAB_EMAIL_FROM ?? "onboarding@resend.dev";

  if (!apiKey) {
    return { sent: false, reason: "RESEND_API_KEY is not set, so nothing was sent." };
  }
  if (!to) {
    return { sent: false, reason: "FAAB_EMAIL_TO is not set, so there is no recipient." };
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return {
      sent: false,
      reason: `Resend refused the message: ${res.status} ${res.statusText}. ${detail.slice(0, 300)}`,
    };
  }

  const body = (await res.json().catch(() => ({}))) as { id?: string };
  return { sent: true, id: body.id };
}
