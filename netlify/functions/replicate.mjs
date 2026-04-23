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

    // Strategy: skip the glambot phase entirely — Hailuo can't reliably execute it
    // in 6 seconds without killing the walk reveal. Full 6s is the carpet money shot.
    // Flashes are described first and most aggressively so the model prioritises them.
    const prompts = {
      male:
        "The subject turns away from camera and immediately begins walking confidently " +
        "down a long glamorous blue carpet. The instant they turn, blinding white paparazzi " +
        "camera flashes explode continuously from both sides — strobing, relentless, " +
        "overwhelming flashes firing every fraction of a second from hundreds of photographers " +
        "packed tightly on both sides. The camera starts low and close behind the subject, " +
        "then dramatically rises and pulls back in a slow cinematic crane move, revealing the " +
        "full grandeur of the scene — an enormous venue with a long blue carpet stretching far " +
        "into the distance, massive cheering crowds behind gold stanchion ropes on both sides, " +
        "photographers everywhere with cameras raised. Subject walks with total confidence and " +
        "purpose, owning every step. Warm dramatic golden cinematic lighting floods the scene. " +
        "The atmosphere is electric, glamorous, overwhelming. " +
        "Preserve the subject's exact face and appearance from the first frame. " +
        "[Cinematic crane rise, Tracking shot from behind, Blue carpet reveal, " +
        "Continuous strobing paparazzi flashes, Massive crowd, High glamour, " +
        "Golden dramatic lighting]",
      female:
        "The subject turns away from camera and immediately begins walking gracefully " +
        "down a long glamorous blue carpet. The instant they turn, blinding white paparazzi " +
        "camera flashes explode continuously from both sides — strobing, relentless, " +
        "overwhelming flashes firing every fraction of a second from hundreds of photographers " +
        "packed tightly on both sides. The camera starts low and close behind the subject, " +
        "then dramatically rises and pulls back in a slow cinematic crane move, revealing the " +
        "full grandeur of the scene — an enormous venue with a long blue carpet stretching far " +
        "into the distance, massive cheering crowds behind gold stanchion ropes on both sides, " +
        "photographers everywhere with cameras raised. Subject walks with total grace and " +
        "elegance, commanding the carpet. Warm dramatic golden cinematic lighting floods the scene. " +
        "The atmosphere is electric, glamorous, overwhelming. " +
        "Preserve the subject's exact face and appearance from the first frame. " +
        "[Cinematic crane rise, Tracking shot from behind, Blue carpet reveal, " +
        "Continuous strobing paparazzi flashes, Massive crowd, High glamour, " +
        "Golden dramatic lighting]",
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
