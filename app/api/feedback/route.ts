import { Resend } from "resend";

export const runtime = "nodejs";

type FeedbackPayload = {
  frequency: string;
  useful: string;
  missing: string;
  email?: string;
  meta?: {
    cardName?: string;
    platform?: string;
    condition?: string;
    observedPrice?: string;
  };
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as FeedbackPayload;

    if (!body?.missing || body.missing.trim().length < 2) {
      return new Response(JSON.stringify({ ok: false, error: "Missing feedback text." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const to = process.env.FEEDBACK_TO_EMAIL;

    if (!to) {
      return new Response(JSON.stringify({ ok: false, error: "FEEDBACK_TO_EMAIL not set." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const subject = `TCG Listing Assistant Feedback (${body.frequency}, ${body.useful})`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>New Feedback</h2>
        <p><b>Frequency:</b> ${escapeHtml(body.frequency)}</p>
        <p><b>Useful:</b> ${escapeHtml(body.useful)}</p>
        <p><b>Missing / Suggestions:</b><br/>${escapeHtml(body.missing).replace(/\n/g, "<br/>")}</p>
        <p><b>Email (optional):</b> ${escapeHtml(body.email ?? "-")}</p>
        <hr/>
        <h3>Context (optional)</h3>
        <pre style="background:#f6f6f6;padding:12px;border-radius:8px;">${escapeHtml(
          JSON.stringify(body.meta ?? {}, null, 2)
        )}</pre>
      </div>
    `;

    await resend.emails.send({
      from: "TCG Listing Assistant <onboarding@resend.dev>",
      to,
      subject,
      html,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: "Server error." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}