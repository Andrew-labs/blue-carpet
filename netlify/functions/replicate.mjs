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
        { headers: { Authorization: `Bearer ${REPLICATE_TOKEN}` } }
      );
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { imageBase64, gender } = await req.json();

    const prompts = {
      male:
        "PHASE ONE (0-2s): The subject stands at the entrance of the blue carpet facing " +
        "directly into the camera. They hold this pose — looking straight into the lens " +
        "with confidence and composure. The camera is tight on their face and chest. " +
        "Blinding white paparazzi flashes strobe from both sides continuously. " +
        "PHASE TWO (2-6s): The subject slowly turns away from the camera and walks " +
        "forward down the blue carpet with slow, deliberate, confident strides. " +
        "The camera pulls back and rises in a slow cinematic crane move revealing " +
        "the full grand venue — enormous hall, long blue carpet stretching into the " +
        "distance, massive crowds behind gold stanchion ropes, hundreds of photographers " +
        "with cameras raised, paparazzi flashes firing continuously from both sides. " +
        "Warm golden cinematic lighting. Subject walks slowly and deliberately, owning every step. " +
        "Preserve the subject's exact face and appearance from the first frame. " +
        "[Face to camera hold, Slow turn, Slow deliberate walk, Cinematic crane rise, " +
        "Blue carpet reveal, Strobing paparazzi flashes, Grand venue, Golden cinematic lighting]",
      female:
        "PHASE ONE (0-2s): The subject stands at the entrance of the blue carpet facing " +
        "directly into the camera. They hold this pose — looking straight into the lens " +
        "with elegance and poise. The camera is tight on their face and chest. " +
        "Blinding white paparazzi flashes strobe from both sides continuously. " +
        "PHASE TWO (2-6s): The subject slowly turns away from the camera and walks " +
        "forward down the blue carpet with slow, deliberate, graceful strides. " +
        "The camera pulls back and rises in a slow cinematic crane move revealing " +
        "the full grand venue — enormous hall, long blue carpet stretching into the " +
        "distance, massive crowds behind gold stanchion ropes, hundreds of photographers " +
        "with cameras raised, paparazzi flashes firing continuously from both sides. " +
        "Warm golden cinematic lighting. Subject walks slowly and gracefully, commanding every step. " +
        "Preserve the subject's exact face and appearance from the first frame. " +
        "[Face to camera hold, Slow turn, Slow deliberate walk, Cinematic crane rise, " +
        "Blue carpet reveal, Strobing paparazzi flashes, Grand venue, Golden cinematic lighting]",
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
