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
        "Ultra slow motion close-up. The camera begins directly in front of the subject " +
        "and slowly pushes in while making a very tight shallow arc of no more than " +
        "30 degrees around the subject — taking the full 2 seconds. " +
        "Background is completely blurred bokeh throughout — no background detail visible. " +
        "Soft even frontal lighting on the subject's face only — no side lighting, " +
        "no relighting, no flash hitting the face directly. " +
        "White camera flash bursts appear only in the blurred background edges, " +
        "not touching the face. Subject is still and composed, looking into the camera. " +
        "After 2 seconds the subject turns and walks slowly down a blue carpet into " +
        "an enormous grand hall. Camera pulls back revealing long blue carpet, massive " +
        "crowds behind gold stanchion ropes, paparazzi firing flashes on both sides. " +
        "Slow deliberate walk. Golden cinematic lighting on the venue.",
      female:
        "Ultra slow motion close-up. The camera begins directly in front of the subject " +
        "and slowly pushes in while making a very tight shallow arc of no more than " +
        "30 degrees around the subject — taking the full 2 seconds. " +
        "Background is completely blurred bokeh throughout — no background detail visible. " +
        "Soft even frontal lighting on the subject's face only — no side lighting, " +
        "no relighting, no flash hitting the face directly. " +
        "White camera flash bursts appear only in the blurred background edges, " +
        "not touching the face. Subject is still and composed, looking into the camera. " +
        "After 2 seconds the subject turns and walks slowly down a blue carpet into " +
        "an enormous grand hall. Camera pulls back revealing long blue carpet, massive " +
        "crowds behind gold stanchion ropes, paparazzi firing flashes on both sides. " +
        "Slow deliberate walk. Golden cinematic lighting on the venue."
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
