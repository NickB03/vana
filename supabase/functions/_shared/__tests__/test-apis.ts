/**
 * Quick API Test Script
 * Tests GLM and OpenRouter APIs with current configuration
 */

const GLM_API_KEY = Deno.env.get("GLM_API_KEY");
const OPENROUTER_FLASH_KEY = Deno.env.get("OPENROUTER_GEMINI_FLASH_KEY");
const OPENROUTER_IMAGE_KEY = Deno.env.get("OPENROUTER_GEMINI_IMAGE_KEY");

console.log("\n=== Testing GLM API ===");
if (GLM_API_KEY) {
  try {
    const response = await fetch("https://api.z.ai/api/coding/paas/v4/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GLM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "zhipu/glm-4.7",
        messages: [{ role: "user", content: "Say: Hello" }],
        max_tokens: 10,
      }),
    });

    console.log(`Status: ${response.status}`);
    const text = await response.text();
    console.log(`Response: ${text.substring(0, 500)}`);
  } catch (error) {
    console.error("GLM Error:", error);
  }
} else {
  console.log("GLM_API_KEY not set");
}

console.log("\n=== Testing OpenRouter Flash ===");
if (OPENROUTER_FLASH_KEY) {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_FLASH_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://vana.sh",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: "Say: Hello" }],
        max_tokens: 10,
      }),
    });

    console.log(`Status: ${response.status}`);
    const text = await response.text();
    console.log(`Response: ${text.substring(0, 500)}`);
  } catch (error) {
    console.error("OpenRouter Flash Error:", error);
  }
} else {
  console.log("OPENROUTER_GEMINI_FLASH_KEY not set");
}

console.log("\n=== Testing OpenRouter Image ===");
if (OPENROUTER_IMAGE_KEY) {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_IMAGE_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://vana.sh",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: "Generate a small blue circle" }],
        max_tokens: 1000,
      }),
    });

    console.log(`Status: ${response.status}`);
    const text = await response.text();
    console.log(`Response: ${text.substring(0, 500)}`);
  } catch (error) {
    console.error("OpenRouter Image Error:", error);
  }
} else {
  console.log("OPENROUTER_GEMINI_IMAGE_KEY not set");
}
