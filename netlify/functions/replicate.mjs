/**
 * Blue Carpet — Netlify Edge Function
 *
 * Model: bytedance/seedance-1-pro-fast
 * Cost:  $0.025/sec at 720p → ~$0.125 for a 5-second clip
 *
 * Why Seedance 1 Pro Fast over Hailuo 2.3 / Veo 3.1?
 *  - Purpose-built for realistic human motion and walking sequences
 *  - Strong face/appearance preservation from the reference first frame
 *  - 30–60% faster inference than Seedance 1 Pro
 *  - ~$0.125 per 5s 720p video vs $0.28 (Hailuo 2.3) or $3.20 (Veo 3.1)
 *  - Supports camera_fixed=false for natural tracking camera movement
 *
 * To switch tiers, change the fetch URL in the POST block:
 *   Cheapest  (~$0.09/5s 720p): bytedance/seedance-1-lite
 *   Balanced  (~$0.125/5s 720p): bytedance/seedance-1-pro-fast  ← current
 *   Highest   (~$0.25/5s 720p): bytedance/seedance-1-pro
 */

export default async (req, context) => {
  const REPLICATE_TOKEN = Netlify.env.get("REPLICATE_API_TOKEN");

  if (!REPLICATE_TOKEN) {
    return new Response(
      JSON.stringify({ error: "REPLICATE_API_TOKEN not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const url = new URL(req.url);

    // ── GET /api/predict?id=xxx — poll prediction status ──────────────────────
    if (req.method === "GET" && url.searchParams.get("id")) {
      const predictionId = url.searchParams.get("id");
      const response = await fetch(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        { headers: { Authorization: `Bearer ${REPLICATE_TOKEN}` } }
      );
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── POST — upload photo + create Seedance prediction ─────────────────────
    const { imageBase64, gender } = await req.json();

    // Step 1: Upload the captured photo to Replicate's file store.
    // Seedance works best with a proper URL reference rather than inline base64.
    let uploadedImageUrl;
    const imageBuffer = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
    const uploadRes = await fetch("https://api.replicate.com/v1/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REPLICATE_TOKEN}`,
        "Content-Type": "image/jpeg",
      },
      body: imageBuffer,
    });

    if (uploadRes.ok) {
      const uploadData = await uploadRes.json();
      uploadedImageUrl = uploadData.urls?.get || uploadData.url;
    }

    // Fallback: use base64 data URI if upload fails
    const imageInput = uploadedImageUrl
      ? uploadedImageUrl
      : `data:image/jpeg;base64,${imageBase64}`;

    // Step 2: Build the hyper-realistic red carpet prompt.
    //
    // Prompt structure follows Seedance's recommended format:
    //   Subject → Action → Camera → Style
    //
    // Key principles:
    //  - Describe the SCENE, not the person (model uses reference image for appearance)
    //  - Specify walking gait for natural motion realism
    //  - Use cinematic camera vocabulary for professional feel
    //  - Anchor atmosphere with lighting and crowd cues
    //  - Two variants per gender for variety across sessions

    const prompts = {
      male: [
        "A man walks confidently down a glamorous red carpet toward the camera. " +
          "Tracking shot, medium full body frame. " +
          "Brilliant camera flashes burst from paparazzi lining both sides. " +
          "Rich red carpet stretches ahead, velvet rope barriers, blurred crowd of photographers. " +
          "Cinematic 35mm lens, shallow depth of field, warm golden event lighting, " +
          "bokeh background of press cameras and event signage. " +
          "Smooth steady-cam movement, natural confident stride, photorealistic, " +
          "film grain, Hollywood premiere atmosphere.",

        "A man strides forward on a red carpet at a prestigious awards ceremony. " +
          "Slow push-in tracking shot, full body to medium close-up. " +
          "Paparazzi camera flashes illuminate the scene in rhythmic bursts. " +
          "Velvet ropes, step-and-repeat banner backdrop, crowd of photographers. " +
          "Cinematic warm amber lighting, 50mm lens, natural walking motion, " +
          "photorealistic skin and fabric detail, shallow focus background, " +
          "elegant luxury event atmosphere.",
      ],
      female: [
        "A woman walks gracefully down a glamorous red carpet toward the camera. " +
          "Tracking shot, medium full body frame. " +
          "Brilliant camera flashes burst from paparazzi lining both sides. " +
          "Rich red carpet stretches ahead, velvet rope barriers, blurred crowd of photographers. " +
          "Cinematic 35mm lens, shallow depth of field, warm golden event lighting, " +
          "bokeh background of press cameras and event signage. " +
          "Smooth steady-cam movement, natural elegant stride, photorealistic, " +
          "film grain, Hollywood premiere atmosphere.",

        "A woman glides forward on a red carpet at a prestigious awards ceremony. " +
          "Slow push-in tracking shot, full body to medium close-up. " +
          "Paparazzi camera flashes illuminate the scene in rhythmic bursts. " +
          "Velvet ropes, step-and-repeat banner backdrop, crowd of photographers. " +
          "Cinematic warm amber lighting, 50mm lens, natural graceful walking motion, " +
          "photorealistic skin and fabric detail, shallow focus background, " +
          "elegant luxury event atmosphere.",
      ],
    };

    const promptList = prompts[gender] || prompts.male;
    const prompt = promptList[Math.floor(Math.random() * promptList.length)];

    // Step 3: Create the Seedance 1 Pro Fast prediction.
    const predictionRes = await fetch(
      "https://api.replicate.com/v1/models/bytedance/seedance-1-pro-fast/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REPLICATE_TOKEN}`,
          "Content-Type": "application/json",
          Prefer: "respond-async",
        },
        body: JSON.stringify({
          input: {
            image: imageInput,       // Reference first frame (the user's photo)
            prompt: prompt,          // Cinematic red carpet scene description
            duration: 5,             // 5 seconds — sweet spot for cost vs. impact
            resolution: "720p",      // Crisp and affordable
            aspect_ratio: "9:16",    // Portrait — matches phone camera capture
            fps: 24,                 // Cinematic frame rate
            camera_fixed: false,     // Allow natural tracking camera movement
          },
        }),
      }
    );

    const predictionData = await predictionRes.json();
    return new Response(JSON.stringify(predictionData), {
      status: predictionRes.status,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = {
  path: "/api/predict",
};
