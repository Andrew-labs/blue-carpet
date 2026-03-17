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
    //
    // Two-phase shot structure:
    // Phase 1 (0-2s): Glambot spin — tight close-up, subject stares directly into
    //   lens, camera sweeps around them in slow motion, background fully blurred.
    // Phase 2 (2-6s): Subject turns and walks confidently away down the red carpet,
    //   camera follows from behind revealing the full scene.
    const prompts = {
      male:
        "PHASE ONE: The subject stares directly and confidently into the camera lens " +
        "with a strong, composed expression — eyes locked forward, never looking away " +
        "or down. The camera is tight on the subject's face and chest. The background " +
        "is completely blurred and out of focus — only the subject is sharp. " +
        "Everything plays in ultra-slow motion. The camera sweeps in a smooth slow arc " +
        "around the subject over two seconds, gliding from a front-facing close-up to " +
        "a side profile while pulling back slightly. Bright warm frontal lighting " +
        "illuminates the subject's face. Soft bokeh light bursts bloom in the " +
        "blurred background. " +
        "PHASE TWO: The subject turns away from the camera and begins walking " +
        "confidently forward down a glamorous red carpet. The camera follows from " +
        "directly behind, slowly pulling back and rising to reveal the full scene — " +
        "a long red carpet stretching into the distance, dense crowds of fans and " +
        "photographers lining both sides behind gold stanchion ropes with red velvet " +
        "barriers. Paparazzi camera flashes fire continuously from both sides. " +
        "Warm golden cinematic lighting. The subject walks with purpose and confidence " +
        "into the scene. " +
        "Preserve the subject's exact face and appearance from the first frame. " +
        "[Glambot arc, Ultra slow motion, Tracking shot from behind, " +
        "Red carpet reveal, High-key frontal lighting, Shallow depth of field]",
      female:
        "PHASE ONE: The subject stares directly and confidently into the camera lens " +
        "with a poised, elegant expression — eyes locked forward, never looking away " +
        "or down. The camera is tight on the subject's face and chest. The background " +
        "is completely blurred and out of focus — only the subject is sharp. " +
        "Everything plays in ultra-slow motion. The camera sweeps in a smooth slow arc " +
        "around the subject over two seconds, gliding from a front-facing close-up to " +
        "a side profile while pulling back slightly. Bright warm frontal lighting " +
        "illuminates the subject's face. Soft bokeh light bursts bloom in the " +
        "blurred background. " +
        "PHASE TWO: The subject turns away from the camera and begins walking " +
        "gracefully forward down a glamorous red carpet. The camera follows from " +
        "directly behind, slowly pulling back and rising to reveal the full scene — " +
        "a long red carpet stretching into the distance, dense crowds of fans and " +
        "photographers lining both sides behind gold stanchion ropes with red velvet " +
        "barriers. Paparazzi camera flashes fire continuously from both sides. " +
        "Warm golden cinematic lighting. The subject walks with grace and elegance " +
        "into the scene. " +
        "Preserve the subject's exact face and appearance from the first frame. " +
        "[Glambot arc, Ultra slow motion, Tracking shot from behind, " +
        "Red carpet reveal, High-key frontal lighting, Shallow depth of field]",
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
