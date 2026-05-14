/**
 * netlify/functions/send-blue-carpet-email.js
 *
 * Called by the frontend at: POST /api/send-blue-carpet-email
 * (Netlify maps /api/* to netlify/functions/* automatically)
 *
 * Body: { email: string, name?: string, videoUrl: string }
 *
 * Flow:
 *  1. Validate inputs
 *  2. Fetch the video from the Replicate CDN URL server-side
 *  3. Base64-encode it and check against the Postmark/Netlify 10 MB limit
 *     - Under limit  → attach the MP4 directly
 *     - Over limit   → pass videoUrl so the template renders a download button
 *  4. POST to /.netlify/functions/emails/blue-carpet (Netlify Email Integration)
 *     with the netlify-emails-secret header — this triggers Postmark
 *
 * Required env vars (set in Netlify UI → Site config → Environment variables):
 *   NETLIFY_EMAILS_SECRET          — from Netlify Email Integration setup
 *   NETLIFY_EMAILS_PROVIDER        — postmark
 *   NETLIFY_EMAILS_PROVIDER_API_KEY — your Postmark Server API token
 *   EMAIL_FROM                     — verified Postmark sender, e.g. "Blue Carpet <hello@sternlaser.co.za>"
 *   URL                            — automatically set by Netlify (your site URL)
 */

// Postmark's hard cap is 10 MB total *after* base64 encoding.
// Base64 inflates raw bytes by ~33 %, so we cap at 7 MB raw
// to leave room for the HTML body and headers.
const MAX_ATTACH_BYTES = 7 * 1024 * 1024; // 7 MB

exports.handler = async function (event) {

  // ── 1. Method guard ───────────────────────────────────────────────────────
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // ── 2. Parse + validate body ──────────────────────────────────────────────
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { email, name, videoUrl } = body;

  if (!email || !email.includes('@')) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Valid email address required.' }) };
  }
  if (!videoUrl || !videoUrl.startsWith('http')) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Valid video URL required.' }) };
  }
  if (!process.env.NETLIFY_EMAILS_SECRET) {
    console.error('[send-blue-carpet-email] NETLIFY_EMAILS_SECRET is not set.');
    return { statusCode: 500, body: JSON.stringify({ error: 'Email service not configured.' }) };
  }

  const displayName = (name || '').trim() || 'Star';

  // ── 3. Fetch the video ────────────────────────────────────────────────────
  let videoBase64 = null;
  let attached    = false;

  try {
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error(`Video fetch failed: ${videoRes.status}`);
    const buf = Buffer.from(await videoRes.arrayBuffer());

    if (buf.byteLength <= MAX_ATTACH_BYTES) {
      videoBase64 = buf.toString('base64');
      attached    = true;
      console.log(`[send-blue-carpet-email] Video fetched (${(buf.byteLength / 1024 / 1024).toFixed(1)} MB) — will attach.`);
    } else {
      console.log(`[send-blue-carpet-email] Video too large (${(buf.byteLength / 1024 / 1024).toFixed(1)} MB) — will link.`);
    }
  } catch (err) {
    // Non-fatal: fall back to link mode so the user still gets the email
    console.warn('[send-blue-carpet-email] Could not fetch video:', err.message);
  }

  // ── 4. Build the Netlify Email Integration request ────────────────────────
  const siteUrl = process.env.URL || 'http://localhost:8888';
  const emailHandlerUrl = `${siteUrl}/.netlify/functions/emails/blue-carpet`;

  const emailBody = {
    from:    process.env.EMAIL_FROM || 'Blue Carpet <noreply@sternlaser.co.za>',
    to:      email,
    subject: 'Your Blue Carpet Moment — iS Clinical Future of Aesthetics 2026',
    parameters: {
      name:     displayName,
      videoUrl: videoUrl,
      attached: attached,   // Handlebars {{#if attached}} in the template
    },
  };

  // Only add attachments array when we actually have the file
  if (attached && videoBase64) {
    emailBody.attachments = [
      {
        content:  videoBase64,
        filename: 'blue-carpet-moment.mp4',
        type:     'video/mp4',          // type is required for Postmark
      },
    ];
  }

  // ── 5. POST to the email handler ──────────────────────────────────────────
  let handlerRes;
  try {
    handlerRes = await fetch(emailHandlerUrl, {
      method: 'POST',
      headers: {
        'Content-Type':         'application/json',
        'netlify-emails-secret': process.env.NETLIFY_EMAILS_SECRET,
      },
      body: JSON.stringify(emailBody),
    });
  } catch (err) {
    console.error('[send-blue-carpet-email] Could not reach email handler:', err.message);
    return { statusCode: 502, body: JSON.stringify({ error: 'Failed to reach email service. Please try again.' }) };
  }

  if (!handlerRes.ok) {
    const errText = await handlerRes.text().catch(() => '');
    console.error(`[send-blue-carpet-email] Email handler returned ${handlerRes.status}:`, errText);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Email delivery failed. Please try again.' }),
    };
  }

  console.log(`[send-blue-carpet-email] Email sent to ${email} — attached: ${attached}`);
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, attached }),
  };
};
