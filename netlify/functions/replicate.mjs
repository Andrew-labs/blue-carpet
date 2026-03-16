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

    // Outfit-focused prompts — describe ONLY motion and scene.
    // "The subject" anchors the model to the reference image person.
    // Never describe the person's appearance — let the model use the photo.
    const prompts = {
      male:
        "The subject wearing this exact outfit walks confidently forward down a blue carpet. " +
        "Full body shot showing the complete outfit from head to toe. " +
        "Smooth tracking shot following forward. " +
        "Brilliant paparazzi camera flashes fire from both sides. " +
        "Velvet rope barriers, cheering crowd, warm golden event lighting. " +
        "Photorealistic, 35mm lens, cinematic.",
      female:
        "The subject wearing this exact outfit walks gracefully forward down a blue carpet. " +
        "Full body shot showing the complete outfit from head to toe. " +
        "Smooth tracking shot following forward. " +
        "Brilliant paparazzi camera flashes fire from both sides. " +
        "Velvet rope barriers, cheering crowd, warm golden event lighting. " +
        "Photorealistic, 35mm lens, cinematic.",
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
            prompt,
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
