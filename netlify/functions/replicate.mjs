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
        "The subject walks confidently forward down a glamorous red carpet. " +
        "Camera starts close behind the subject then slowly dollies back and widens " +
        "to reveal the full red carpet scene. Crowds of fans and photographers line " +
        "both sides behind gold stanchion ropes. Bright paparazzi camera flashes fire " +
        "from both sides. Warm golden cinematic lighting. Hyper-realistic. " +
        "Preserve the subject's exact face and appearance from the first frame. " +
        "[Tracking shot, Dolly out, Wide angle]",
      female:
        "The subject walks gracefully forward down a glamorous red carpet. " +
        "Camera starts close behind the subject then slowly dollies back and widens " +
        "to reveal the full red carpet scene. Crowds of fans and photographers line " +
        "both sides behind gold stanchion ropes. Bright paparazzi camera flashes fire " +
        "from both sides. Warm golden cinematic lighting. Hyper-realistic. " +
        "Preserve the subject's exact face and appearance from the first frame. " +
        "[Tracking shot, Dolly out, Wide angle]",
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
