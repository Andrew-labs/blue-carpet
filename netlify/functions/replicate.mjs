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

    // ── GET /api/predict?id=xxx — poll video prediction status ────────────────
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

    // ── POST — two-step pipeline: face swap → video ───────────────────────────
    const { imageBase64, gender } = await req.json();

    // Pre-made red carpet target images (person in tuxedo/gown on blue carpet)
    // The face swap model will replace the face in these images with the user's face
    const targetImages = {
      male: "https://images.easelai.com/mirror_fal/men_single_player/rip.jpg",
      female: "https://images.easelai.com/mirror_fal/women_single_player/gala.jpg",
    };

    const targetImage = targetImages[gender] || targetImages.male;

    // ── STEP 1: Upload user photo to Replicate ────────────────────────────────
    const imageBytes = Buffer.from(imageBase64, "base64");
    const blob = new Blob([imageBytes], { type: "image/jpeg" });
    const formData = new FormData();
    formData.append("content", blob, "face.jpg");

    const uploadRes = await fetch("https://api.replicate.com/v1/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${REPLICATE_TOKEN}` },
      body: formData,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error("Photo upload failed: " + err);
    }

    const uploadData = await uploadRes.json();
    const faceImageUrl = uploadData.urls?.get || uploadData.url;
    if (!faceImageUrl) throw new Error("No URL returned from photo upload");

    // ── STEP 2: Face swap — put user's face onto red carpet target image ──────
    const faceSwapRes = await fetch(
      "https://api.replicate.com/v1/models/easel/advanced-face-swap/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REPLICATE_TOKEN}`,
          "Content-Type": "application/json",
          "Prefer": "wait",
        },
        body: JSON.stringify({
          input: {
            swap_image: faceImageUrl,
            target_image: targetImage,
            hair_source: "target",
            user_gender: gender === "male" ? "a man" : "a woman",
          },
        }),
      }
    );

    if (!faceSwapRes.ok) {
      const err = await faceSwapRes.json().catch(() => ({}));
      throw new Error("Face swap failed: " + (err.detail || faceSwapRes.status));
    }

    let faceSwap = await faceSwapRes.json();

    // Poll face swap until done if not already
    while (faceSwap.status !== "succeeded" && faceSwap.status !== "failed" && faceSwap.status !== "canceled") {
      await sleep(2000);
      const pollRes = await fetch(
        `https://api.replicate.com/v1/predictions/${faceSwap.id}`,
        { headers: { Authorization: `Bearer ${REPLICATE_TOKEN}` } }
      );
      faceSwap = await pollRes.json();
    }

    if (faceSwap.status !== "succeeded") {
      throw new Error("Face swap did not succeed: " + (faceSwap.error || faceSwap.status));
    }

    const swappedImageUrl = Array.isArray(faceSwap.output) ? faceSwap.output[0] : faceSwap.output;
    if (!swappedImageUrl) throw new Error("No output URL from face swap");

    // ── STEP 3: Animate the face-swapped image with Seedance ─────────────────
    const prompts = {
      male:
        "The subject walks confidently forward down a blue carpet. " +
        "Smooth tracking shot at chest level. " +
        "Paparazzi cameras flash from both sides. " +
        "Velvet ropes, cheering crowd, warm golden lighting. " +
        "Photorealistic, cinematic, 35mm lens.",
      female:
        "The subject walks gracefully forward down a blue carpet. " +
        "Smooth tracking shot at chest level. " +
        "Paparazzi cameras flash from both sides. " +
        "Velvet ropes, cheering crowd, warm golden lighting. " +
        "Photorealistic, cinematic, 35mm lens.",
    };

    const videoRes = await fetch(
      "https://api.replicate.com/v1/models/bytedance/seedance-1-pro-fast/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REPLICATE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            image: swappedImageUrl,
            prompt: prompts[gender] || prompts.male,
            duration: 5,
            resolution: "720p",
            aspect_ratio: "9:16",
            fps: 24,
            camera_fixed: false,
          },
        }),
      }
    );

    const videoData = await videoRes.json();
    return new Response(JSON.stringify(videoData), {
      status: videoRes.status,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export const config = {
  path: "/api/predict",
};
