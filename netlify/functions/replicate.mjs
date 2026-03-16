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

    // POST — create Runway Gen-4.5 prediction
    const { imageBase64, gender } = await req.json();

    // Runway Gen-4.5 prompt: describe ONLY motion, not the person.
    // The model uses the first frame image for appearance.
    const prompts = {
      male:
        "The subject walks confidently forward down a glamorous blue carpet. " +
        "Brilliant paparazzi camera flashes fire from both sides. " +
        "Velvet rope barriers, elegant cheering crowd, warm golden overhead lighting. " +
        "Smooth tracking shot at chest level. Cinematic, photorealistic.",
      female:
        "The subject walks gracefully forward down a glamorous blue carpet. " +
        "Brilliant paparazzi camera flashes fire from both sides. " +
        "Velvet rope barriers, elegant cheering crowd, warm golden overhead lighting. " +
        "Smooth tracking shot at chest level. Cinematic, photorealistic.",
    };

    const prompt = prompts[gender] || prompts.male;

    const predictionRes = await fetch(
      "https://api.replicate.com/v1/models/runwayml/gen-4.5/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REPLICATE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            prompt,
            image: `data:image/jpeg;base64,${imageBase64}`,
            duration: 5,
            ratio: "720:1280",  // 9:16 portrait
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
