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

    // POST /api/predict — two step process:
    // Step 1: upload base64 image to Replicate to get a URL
    // Step 2: create Veo 3.1 prediction using reference_images
    const { imageBase64, gender } = await req.json();

    // Upload image to Replicate file storage
    const imageBuffer = Buffer.from(imageBase64, "base64");
    const uploadRes = await fetch("https://api.replicate.com/v1/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REPLICATE_TOKEN}`,
        "Content-Type": "image/jpeg",
        "Content-Length": imageBuffer.length,
      },
      body: imageBuffer,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      throw new Error("Image upload failed: " + (err.detail || uploadRes.status));
    }

    const uploadData = await uploadRes.json();
    const imageUrl = uploadData.urls?.get || uploadData.url;

    if (!imageUrl) throw new Error("No image URL returned from upload");

    // Gender-specific prompts using Veo 3.1 reference_images approach
    const prompts = {
      male:
        "Single shot. A well-dressed man in a sharp black tuxedo strides confidently down a glamorous blue carpet at a luxury gala. " +
        "Paparazzi cameras fire brilliant white flashes from both sides. Elegant crowd behind velvet ropes. " +
        "Warm golden overhead lighting. Tracking shot at chest level following the subject forward. " +
        "Photorealistic, 35mm lens, natural motion, cinematic.",
      female:
        "Single shot. An elegant woman in a stunning red floor-length gown strides confidently down a glamorous blue carpet at a luxury gala. " +
        "Paparazzi cameras fire brilliant white flashes from both sides. Elegant crowd behind velvet ropes. " +
        "Warm golden overhead lighting. Tracking shot at chest level following the subject forward. " +
        "Photorealistic, 35mm lens, natural motion, cinematic.",
    };

    const prompt = prompts[gender] || prompts.male;

    // Create Veo 3.1 prediction with reference_images
    const predictionRes = await fetch(
      "https://api.replicate.com/v1/models/google/veo-3.1/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REPLICATE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            prompt,
            reference_images: [imageUrl],
            duration: 8,
            resolution: "720p",
            generate_audio: true,
            aspect_ratio: "9:16",
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
