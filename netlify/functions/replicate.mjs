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

    // GET /api/predict?id=xxx — poll prediction status
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

    // POST — create Hailuo 2.3 prediction
    const { imageBase64, gender } = await req.json();

    // Key principle: DO NOT describe the person's appearance, face, hair, or outfit
    // in the prompt — the model must derive all of that from the reference image.
    // The prompt covers ONLY camera movement, scene, and atmosphere so the
    // subject's likeness is preserved exactly as in the first frame.
    const prompts = {
      male:
        "The subject stands poised on a glamorous red carpet, then begins walking " +
        "forward with slow, fluid confidence. A robotic arm camera executes a sweeping " +
        "high-speed arc — launching from a tight low-angle close-up of the subject's " +
        "face and upper body, then rapidly orbiting around them in a smooth 180-degree " +
        "arc while simultaneously pulling back and rising to reveal the full red carpet " +
        "scene. The motion plays back in ultra-slow motion, giving every hair movement, " +
        "fabric ripple, and blink a weightless, hyper-cinematic quality. Dense crowds of " +
        "fans and photographers line both sides behind gold stanchion ropes. Rapid-fire " +
        "paparazzi flashes burst from all directions, streaking into soft bokeh orbs in " +
        "the background. Camera shoots wide open at f/2.8 — subject is razor-sharp while " +
        "the background crowd dissolves into a warm, glittering blur. Lighting is " +
        "extremely bright and punchy, blasting the subject from the front to achieve an " +
        "overexposed, high-key glamour look. Warm golden tones with rich specular " +
        "highlights on skin and fabric. The overall feel is weightless and suspended in " +
        "time. Preserve the subject's exact face and appearance from the first frame. " +
        "[Robotic arm shot, High-speed 1000fps slow motion, Orbital arc dolly, " +
        "Wide-open aperture bokeh, High-key glamour lighting]",
      female:
        "The subject stands poised on a glamorous red carpet, then begins walking " +
        "forward with slow, graceful confidence. A robotic arm camera executes a sweeping " +
        "high-speed arc — launching from a tight low-angle close-up of the subject's " +
        "face and upper body, then rapidly orbiting around them in a smooth 180-degree " +
        "arc while simultaneously pulling back and rising to reveal the full red carpet " +
        "scene. The motion plays back in ultra-slow motion, giving every hair movement, " +
        "fabric ripple, and blink a weightless, hyper-cinematic quality. Dense crowds of " +
        "fans and photographers line both sides behind gold stanchion ropes. Rapid-fire " +
        "paparazzi flashes burst from all directions, streaking into soft bokeh orbs in " +
        "the background. Camera shoots wide open at f/2.8 — subject is razor-sharp while " +
        "the background crowd dissolves into a warm, glittering blur. Lighting is " +
        "extremely bright and punchy, blasting the subject from the front to achieve an " +
        "overexposed, high-key glamour look. Warm golden tones with rich specular " +
        "highlights on skin and fabric. The overall feel is weightless and suspended in " +
        "time. Preserve the subject's exact face and appearance from the first frame. " +
        "[Robotic arm shot, High-speed 1000fps slow motion, Orbital arc dolly, " +
        "Wide-open aperture bokeh, High-key glamour lighting]",
    };

    const prompt = prompts[gender] || prompts.male;

    const predictionRes = await fetch(
      "https://api.replicate.com/v1/models/minimax/hailuo-2.3/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REPLICATE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            prompt,
            first_frame_image: `data:image/jpeg;base64,${imageBase64}`,
            duration: 6,
            resolution: "768p",
            prompt_optimizer: false,
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
