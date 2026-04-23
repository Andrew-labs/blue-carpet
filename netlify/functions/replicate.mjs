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
        "PHASE ONE (0-1s): Glambot close-up. The subject is wearing a sharp black tuxedo. " +
        "The subject stares directly and confidently into the camera lens — eyes locked forward. " +
        "The camera is extremely tight on the subject's face and chest. Background is fully " +
        "blurred bokeh. Ultra slow motion. The camera makes a brief smooth arc sweep around " +
        "the subject over one second, from front-facing to slight side profile. Bright warm " +
        "frontal lighting on the subject's face. " +
        "PHASE TWO (1-6s): The subject turns and walks confidently away down a glamorous " +
        "blue carpet, black tuxedo visible from behind. The camera immediately pulls back and " +
        "rises, following from behind to reveal the full scene. Explosive strobing paparazzi " +
        "flash bursts erupt relentlessly from both sides — blinding white camera flashes firing " +
        "every half second from dense crowds of photographers. Long blue carpet stretches into " +
        "the distance. Fans packed behind gold stanchion ropes on both sides. Warm golden " +
        "cinematic lighting. Subject walks with purpose and confidence. " +
        "Preserve the subject's exact face and appearance from the first frame. " +
        "[Glambot arc, Ultra slow motion phase one, Tracking shot from behind phase two, " +
        "Blue carpet reveal, Strobing paparazzi flashes, Black tuxedo, Shallow depth of field]",
      female:
        "PHASE ONE (0-1s): Glambot close-up. The subject stares directly and confidently " +
        "into the camera lens — eyes locked forward with a poised elegant expression. " +
        "The camera is extremely tight on the subject's face. Background is fully blurred bokeh. " +
        "Ultra slow motion. The camera makes a brief smooth arc sweep around the subject " +
        "over one second, from front-facing to slight side profile. Bright warm frontal " +
        "lighting on the subject's face. " +
        "PHASE TWO (1-6s): The subject turns and walks gracefully away down a glamorous " +
        "blue carpet. The camera immediately pulls back and rises, following from behind to " +
        "reveal the full scene. Explosive strobing paparazzi flash bursts erupt relentlessly " +
        "from both sides — blinding white camera flashes firing every half second from dense " +
        "crowds of photographers. Long blue carpet stretches into the distance. Fans packed " +
        "behind gold stanchion ropes on both sides. Warm golden cinematic lighting. Subject " +
        "walks with grace and elegance. " +
        "Preserve the subject's exact face and appearance from the first frame. " +
        "[Glambot arc, Ultra slow motion phase one, Tracking shot from behind phase two, " +
        "Blue carpet reveal, Strobing paparazzi flashes, Shallow depth of field]",
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
