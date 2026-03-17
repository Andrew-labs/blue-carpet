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
        "The subject is already standing on a glamorous red carpet, facing the camera " +
        "and the crowd of photographers. Intense bright frontal lighting illuminates " +
        "the subject's face — warm, high-key, luminous. The camera begins close, " +
        "framing the subject's face and upper body from a slight low angle. " +
        "Everything plays in ultra-slow motion — every blink, every breath, every " +
        "subtle movement suspended in time. The robotic arm camera sweeps in a smooth " +
        "90-degree arc around the subject from front to side, while simultaneously " +
        "pulling back and rising to reveal the full red carpet scene behind and around " +
        "them. As the camera orbits, the subject naturally turns their head to keep " +
        "facing the lens, posing with calm confidence. The subject's face remains " +
        "visible and sharp throughout the entire shot. Background crowd of " +
        "photographers and fans lines both sides behind gold stanchion ropes with red " +
        "velvet barriers, dissolving into warm glittering bokeh. Rapid paparazzi " +
        "camera flashes burst continuously from the crowd, blooming into soft light " +
        "orbs. The red carpet stretches into the distance. Warm golden cinematic " +
        "tones. The overall feel is weightless, glamorous, and suspended in time — " +
        "like a single perfect moment stretched into eternity. " +
        "Preserve the subject's exact face and appearance from the first frame. " +
        "[Glambot robotic arm shot, Ultra slow motion, Smooth orbital arc front-to-side, " +
        "High-key frontal lighting, Shallow depth of field bokeh, Red carpet reveal]",
      female:
        "The subject is already standing on a glamorous red carpet, facing the camera " +
        "and the crowd of photographers. Intense bright frontal lighting illuminates " +
        "the subject's face — warm, high-key, luminous. The camera begins close, " +
        "framing the subject's face and upper body from a slight low angle. " +
        "Everything plays in ultra-slow motion — every blink, every breath, every " +
        "subtle movement suspended in time. The robotic arm camera sweeps in a smooth " +
        "90-degree arc around the subject from front to side, while simultaneously " +
        "pulling back and rising to reveal the full red carpet scene behind and around " +
        "them. As the camera orbits, the subject naturally turns their head to keep " +
        "facing the lens, posing with graceful elegance. The subject's face remains " +
        "visible and sharp throughout the entire shot. Background crowd of " +
        "photographers and fans lines both sides behind gold stanchion ropes with red " +
        "velvet barriers, dissolving into warm glittering bokeh. Rapid paparazzi " +
        "camera flashes burst continuously from the crowd, blooming into soft light " +
        "orbs. The red carpet stretches into the distance. Warm golden cinematic " +
        "tones. The overall feel is weightless, glamorous, and suspended in time — " +
        "like a single perfect moment stretched into eternity. " +
        "Preserve the subject's exact face and appearance from the first frame. " +
        "[Glambot robotic arm shot, Ultra slow motion, Smooth orbital arc front-to-side, " +
        "High-key frontal lighting, Shallow depth of field bokeh, Red carpet reveal]",
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
