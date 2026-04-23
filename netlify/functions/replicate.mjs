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

    const prompts = {
      male:
        "Cinematic tracking shot. The subject is already standing at the entrance of a " +
        "glamorous blue carpet, back to camera, poised and still for one brief moment. " +
        "Then they begin walking forward down the carpet — slow, deliberate, confident strides. " +
        "The entire video takes place on the blue carpet — no bedroom, no indoor room, " +
        "no transition. The scene begins on the carpet and stays on the carpet. " +
        "Blinding white paparazzi camera flashes strobe relentlessly from both sides — " +
        "hundreds of photographers firing continuously. " +
        "The camera rises slowly and pulls back revealing an enormous grand venue, " +
        "long blue carpet stretching into the distance, massive crowds behind gold " +
        "stanchion ropes on both sides. Subject walks slowly with total confidence, " +
        "taking long deliberate strides. Warm golden cinematic lighting. " +
        "Preserve the subject's exact face and appearance from the first frame. " +
        "[Blue carpet entrance, Slow deliberate walk, Cinematic crane rise, " +
        "Tracking shot from behind, Strobing paparazzi flashes, Grand venue, " +
        "Golden cinematic lighting, No bedroom, No indoor room]",
      female:
        "Cinematic tracking shot. The subject is already standing at the entrance of a " +
        "glamorous blue carpet, back to camera, poised and still for one brief moment. " +
        "Then they begin walking forward down the carpet — slow, deliberate, graceful strides. " +
        "The entire video takes place on the blue carpet — no bedroom, no indoor room, " +
        "no transition. The scene begins on the carpet and stays on the carpet. " +
        "Blinding white paparazzi camera flashes strobe relentlessly from both sides — " +
        "hundreds of photographers firing continuously. " +
        "The camera rises slowly and pulls back revealing an enormous grand venue, " +
        "long blue carpet stretching into the distance, massive crowds behind gold " +
        "stanchion ropes on both sides. Subject walks slowly with total grace and elegance, " +
        "taking long deliberate strides. Warm golden cinematic lighting. " +
        "Preserve the subject's exact face and appearance from the first frame. " +
        "[Blue carpet entrance, Slow deliberate walk, Cinematic crane rise, " +
        "Tracking shot from behind, Strobing paparazzi flashes, Grand venue, " +
        "Golden cinematic lighting, No bedroom, No indoor room]",
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
