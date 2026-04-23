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
        "Static portrait shot for the first 2 seconds. The subject stands perfectly still " +
        "facing the camera, not moving, not turning, not smiling differently, face unchanged. " +
        "Camera is locked, not moving. Background is a blue carpet entrance with paparazzi " +
        "on both sides — their camera flashes strobe brightly from the sides of the frame, " +
        "lighting up the edges of the shot but not changing the subject's face. " +
        "After 2 seconds: the subject turns away from camera and walks slowly down the blue " +
        "carpet into an enormous grand hall. Camera pulls back and rises, revealing long blue " +
        "carpet, massive crowds behind gold stanchion ropes, hundreds of photographers firing " +
        "flashes. Warm golden cinematic lighting on the venue. Slow deliberate walking pace.",
      female:
        "Static portrait shot for the first 2 seconds. The subject stands perfectly still " +
        "facing the camera, not moving, not turning, not smiling differently, face unchanged. " +
        "Camera is locked, not moving. Background is a blue carpet entrance with paparazzi " +
        "on both sides — their camera flashes strobe brightly from the sides of the frame, " +
        "lighting up the edges of the shot but not changing the subject's face. " +
        "After 2 seconds: the subject turns away from camera and walks slowly down the blue " +
        "carpet into an enormous grand hall. Camera pulls back and rises, revealing long blue " +
        "carpet, massive crowds behind gold stanchion ropes, hundreds of photographers firing " +
        "flashes. Warm golden cinematic lighting on the venue. Slow deliberate walking pace."
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
