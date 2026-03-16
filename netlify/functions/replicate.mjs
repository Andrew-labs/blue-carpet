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

    // POST — create Seedance prediction
    const { imageBase64, gender } = await req.json();

    // KEY RULE: Never describe the person in the prompt.
    // The model uses the reference image for appearance.
    // The prompt ONLY describes motion, camera and scene.
    const prompts = {
      male:
        "The subject walks confidently forward down a blue carpet. " +
        "He is wearing a sharp black tuxedo. " +
        "Smooth tracking shot at chest level following the subject. " +
        "Paparazzi cameras flash brilliantly from both sides. " +
        "Velvet ropes, cheering crowd, warm golden lighting. " +
        "Cinematic, photorealistic, 35mm lens, shallow depth of field.",
      female:
        "The subject walks gracefully forward down a blue carpet. " +
        "She is wearing an elegant red gown. " +
        "Smooth tracking shot at chest level following the subject. " +
        "Paparazzi cameras flash brilliantly from both sides. " +
        "Velvet ropes, cheering crowd, warm golden lighting. " +
        "Cinematic, photorealistic, 35mm lens, shallow depth of field.",
    };

    const prompt = prompts[gender] || prompts.male;

    const predictionRes = await fetch(
      "https://api.replicate.com/v1/models/bytedance/seedance-1-pro-fast/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REPLICATE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            image: `data:image/jpeg;base64,${imageBase64}`,
            prompt: prompt,
            duration: 5,
            resolution: "720p",
            aspect_ratio: "9:16",
            fps: 24,
            camera_fixed: false,
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
