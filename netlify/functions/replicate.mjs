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

    // POST — upload image then create Kling 3.0 Omni prediction
    const { imageBase64, gender } = await req.json();

    // Upload image to Replicate file storage via multipart form
    const imageBytes = Buffer.from(imageBase64, "base64");
    const blob = new Blob([imageBytes], { type: "image/jpeg" });
    const formData = new FormData();
    formData.append("content", blob, "photo.jpg");

    const uploadRes = await fetch("https://api.replicate.com/v1/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${REPLICATE_TOKEN}` },
      body: formData,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error("Image upload failed: " + err);
    }

    const uploadData = await uploadRes.json();
    const imageUrl = uploadData.urls?.get || uploadData.url;
    if (!imageUrl) throw new Error("No image URL returned from upload");

    // Kling 3.0 Omni uses <<<image_1>>> tag in prompt to reference the person
    const prompts = {
      male:
        "<<<image_1>>> is wearing a sharp black tuxedo with white dress shirt and black bow tie, " +
        "walking confidently down a glamorous blue carpet at a luxury gala event. " +
        "Paparazzi cameras fire brilliant white flashes from both sides. " +
        "Elegant well-dressed crowd behind velvet ropes cheering. " +
        "Warm golden overhead lighting. Camera tracks forward at chest level. " +
        "Photorealistic, cinematic, 35mm lens.",
      female:
        "<<<image_1>>> is wearing a stunning floor-length red gown, " +
        "walking confidently down a glamorous blue carpet at a luxury gala event. " +
        "Paparazzi cameras fire brilliant white flashes from both sides. " +
        "Elegant well-dressed crowd behind velvet ropes cheering. " +
        "Warm golden overhead lighting. Camera tracks forward at chest level. " +
        "Photorealistic, cinematic, 35mm lens.",
    };

    const prompt = prompts[gender] || prompts.male;

    // Create Kling 3.0 Omni prediction
    const predictionRes = await fetch(
      "https://api.replicate.com/v1/models/kwaivgi/kling-v3-omni-video/predictions",
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
            mode: "pro",
            duration: 8,
            aspect_ratio: "9:16",
            generate_audio: true,
            negative_prompt: "cartoon, animation, illustration, blurry, low quality, distorted face",
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
