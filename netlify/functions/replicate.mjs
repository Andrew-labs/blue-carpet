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

    if (req.method === "GET" && url.searchParams.get("id")) {
      const predictionId = url.searchParams.get("id");

      const response = await fetch(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        {
          headers: {
            Authorization: `Bearer ${REPLICATE_TOKEN}`,
          },
        }
      );

      const data = await response.json();

      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { imageBase64, gender } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "imageBase64 is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const prompts = {
      male:
        "Create a hyper realistic cinematic video from the provided first frame image. " +
        "Preserve the exact identity, male facial features, face shape, skin tone, hairstyle, clothing, body proportions, " +
        "and expression of the man in the image. The man must look like the same real person throughout the entire video, " +
        "with no face morphing, no age change, no beauty filter, and no change of outfit. " +

        "Start with an ultra realistic slow motion close-up portrait. The camera begins directly in front of the man " +
        "and slowly pushes in with a subtle cinematic arc, less than 30 degrees, over the first 2 seconds. " +
        "Use shallow depth of field, realistic 85mm portrait lens, soft natural frontal key light, detailed skin texture, " +
        "natural eyes, realistic hair movement, and subtle breathing. The man remains calm, confident, and composed, " +
        "looking into the camera. " +

        "The background is heavily blurred blue-carpet event bokeh with soft white paparazzi flashes only at the far " +
        "background edges. The flashes must not hit or overexpose the face. " +

        "After 2 seconds, the man naturally turns and walks slowly forward down a luxurious blue carpet inside an enormous " +
        "grand hall. The camera smoothly pulls back to reveal the long blue carpet, gold stanchion ropes, elegant architecture, " +
        "warm cinematic venue lighting, and large cheering crowds kept slightly out of focus on both sides. Paparazzi flashes " +
        "continue in the background. " +

        "Keep the motion smooth, physically realistic, and stable. Maintain consistent male facial features, consistent clothing, " +
        "realistic hands, realistic walking posture, natural fabric movement, and photorealistic lighting throughout. " +

        "Avoid cartoon style, CGI look, plastic skin, face distortion, identity change, extra fingers, warped hands, flickering face, " +
        "changing clothes, changing hairstyle, text, logos, watermarks, glitches, extreme camera shake, overexposure, low resolution, " +
        "and a blurry subject.",

      female:
        "Create a hyper realistic cinematic video from the provided first frame image. " +
        "Preserve the exact identity, female facial features, face shape, skin tone, hairstyle, clothing, body proportions, " +
        "and expression of the woman in the image. The woman must look like the same real person throughout the entire video, " +
        "with no face morphing, no age change, no beauty filter, and no change of outfit. " +

        "Start with an ultra realistic slow motion close-up portrait. The camera begins directly in front of the woman " +
        "and slowly pushes in with a subtle cinematic arc, less than 30 degrees, over the first 2 seconds. " +
        "Use shallow depth of field, realistic 85mm portrait lens, soft natural frontal key light, detailed skin texture, " +
        "natural eyes, realistic hair movement, and subtle breathing. The woman remains calm, confident, and composed, " +
        "looking into the camera. " +

        "The background is heavily blurred blue-carpet event bokeh with soft white paparazzi flashes only at the far " +
        "background edges. The flashes must not hit or overexpose the face. " +

        "After 2 seconds, the woman naturally turns and walks slowly forward down a luxurious blue carpet inside an enormous " +
        "grand hall. The camera smoothly pulls back to reveal the long blue carpet, gold stanchion ropes, elegant architecture, " +
        "warm cinematic venue lighting, and large cheering crowds kept slightly out of focus on both sides. Paparazzi flashes " +
        "continue in the background. " +

        "Keep the motion smooth, physically realistic, and stable. Maintain consistent female facial features, consistent clothing, " +
        "realistic hands, realistic walking posture, natural fabric movement, and photorealistic lighting throughout. " +

        "Avoid cartoon style, CGI look, plastic skin, face distortion, identity change, extra fingers, warped hands, flickering face, " +
        "changing clothes, changing hairstyle, text, logos, watermarks, glitches, extreme camera shake, overexposure, low resolution, " +
        "and a blurry subject.",
    };

    const selectedGender = String(gender || "male").toLowerCase();
    const prompt = prompts[selectedGender] || prompts.male;

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
      JSON.stringify({ error: err.message || "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = {
  path: "/api/predict",
};
