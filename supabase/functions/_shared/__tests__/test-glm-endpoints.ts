/**
 * Test different GLM endpoint configurations
 */

const GLM_API_KEY = Deno.env.get("GLM_API_KEY");

if (!GLM_API_KEY) {
  console.error("GLM_API_KEY not set");
  Deno.exit(1);
}

const testCases = [
  {
    name: "Current config: /api/coding/paas/v4 with zhipu/glm-4.7",
    endpoint: "https://api.z.ai/api/coding/paas/v4/chat/completions",
    model: "zhipu/glm-4.7",
  },
  {
    name: "Standard endpoint: /api/paas/v4 with glm-4.7",
    endpoint: "https://api.z.ai/api/paas/v4/chat/completions",
    model: "glm-4.7",
  },
  {
    name: "Coding endpoint with glm-4.7",
    endpoint: "https://api.z.ai/api/coding/paas/v4/chat/completions",
    model: "glm-4.7",
  },
  {
    name: "Standard endpoint with zhipu/glm-4.7",
    endpoint: "https://api.z.ai/api/paas/v4/chat/completions",
    model: "zhipu/glm-4.7",
  },
];

for (const test of testCases) {
  console.log(`\n=== ${test.name} ===`);
  try {
    const response = await fetch(test.endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GLM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: test.model,
        messages: [{ role: "user", content: "Say: test" }],
        max_tokens: 5,
      }),
    });

    console.log(`Status: ${response.status}`);
    const text = await response.text();
    if (response.ok) {
      const data = JSON.parse(text);
      console.log(`✅ SUCCESS`);
      console.log(`Response: ${data.choices?.[0]?.message?.content || "No content"}`);
    } else {
      console.log(`❌ FAILED`);
      console.log(`Error: ${text.substring(0, 200)}`);
    }
  } catch (error) {
    console.error(`❌ Exception:`, error instanceof Error ? error.message : String(error));
  }
}
