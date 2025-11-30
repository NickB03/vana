import { describe, it, beforeEach, afterEach } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import { assertEquals, assertExists, assertMatch } from "@std/assert";
import { Logger, createLogger, logger, type LogEntry, type LoggerContext } from "../logger.ts";

describe("Logger", () => {
  let consoleOutput: string[] = [];
  const originalLog = console.log;

  beforeEach(() => {
    consoleOutput = [];
    // Capture console.log output
    console.log = (message: string) => {
      consoleOutput.push(message);
    };
  });

  afterEach(() => {
    // Restore original console.log
    console.log = originalLog;
  });

  describe("Basic Logging", () => {
    it("should log debug messages", () => {
      const log = new Logger();
      log.debug("test_debug", { foo: "bar" });

      assertEquals(consoleOutput.length, 1);
      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      assertEquals(entry.level, "debug");
      assertEquals(entry.message, "test_debug");
      assertEquals(entry.data?.foo, "bar");
      assertExists(entry.timestamp);
    });

    it("should log info messages", () => {
      const log = new Logger();
      log.info("test_info", { count: 42 });

      assertEquals(consoleOutput.length, 1);
      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      assertEquals(entry.level, "info");
      assertEquals(entry.message, "test_info");
      assertEquals(entry.data?.count, 42);
    });

    it("should log warn messages", () => {
      const log = new Logger();
      log.warn("test_warn", { reason: "deprecated" });

      assertEquals(consoleOutput.length, 1);
      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      assertEquals(entry.level, "warn");
      assertEquals(entry.message, "test_warn");
      assertEquals(entry.data?.reason, "deprecated");
    });

    it("should log error messages with stack traces", () => {
      const log = new Logger();
      const error = new Error("Test error");
      log.error("test_error", error, { operation: "test" });

      assertEquals(consoleOutput.length, 1);
      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      assertEquals(entry.level, "error");
      assertEquals(entry.message, "test_error");
      assertEquals(entry.error?.name, "Error");
      assertEquals(entry.error?.message, "Test error");
      assertExists(entry.error?.stack);
      assertEquals(entry.data?.operation, "test");
    });
  });

  describe("Context Injection", () => {
    it("should include requestId in all logs", () => {
      const log = new Logger({ requestId: "req-123" });
      log.info("test_message");

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      assertEquals(entry.requestId, "req-123");
    });

    it("should include userId in all logs", () => {
      const log = new Logger({ userId: "user-456" });
      log.info("test_message");

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      assertEquals(entry.userId, "user-456");
    });

    it("should include sessionId in all logs", () => {
      const log = new Logger({ sessionId: "session-789" });
      log.info("test_message");

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      assertEquals(entry.sessionId, "session-789");
    });

    it("should include all context fields", () => {
      const context: LoggerContext = {
        requestId: "req-123",
        userId: "user-456",
        sessionId: "session-789"
      };
      const log = new Logger(context);
      log.info("test_message");

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      assertEquals(entry.requestId, "req-123");
      assertEquals(entry.userId, "user-456");
      assertEquals(entry.sessionId, "session-789");
    });
  });

  describe("Child Logger", () => {
    it("should inherit parent context", () => {
      const parent = new Logger({ requestId: "req-123" });
      const child = parent.child({ userId: "user-456" });
      child.info("test_message");

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      assertEquals(entry.requestId, "req-123");
      assertEquals(entry.userId, "user-456");
    });

    it("should override parent context", () => {
      const parent = new Logger({ requestId: "req-123", userId: "user-old" });
      const child = parent.child({ userId: "user-new" });
      child.info("test_message");

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      assertEquals(entry.requestId, "req-123");
      assertEquals(entry.userId, "user-new");
    });

    it("should not affect parent logger", () => {
      const parent = new Logger({ requestId: "req-123" });
      const child = parent.child({ userId: "user-456" });

      parent.info("parent_message");
      const parentEntry = JSON.parse(consoleOutput[0]) as LogEntry;
      assertEquals(parentEntry.userId, undefined);

      child.info("child_message");
      const childEntry = JSON.parse(consoleOutput[1]) as LogEntry;
      assertEquals(childEntry.userId, "user-456");
    });
  });

  describe("Specialized Logging Methods", () => {
    it("should log request details", () => {
      const log = new Logger({ requestId: "req-123" });
      log.request("POST", "/chat", { body: "test" });

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      assertEquals(entry.message, "request_received");
      assertEquals(entry.data?.method, "POST");
      assertEquals(entry.data?.path, "/chat");
      assertEquals(entry.data?.body, "test");
    });

    it("should log response details", () => {
      const log = new Logger({ requestId: "req-123" });
      log.response(200, 150, { bytes: 1024 });

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      assertEquals(entry.message, "request_completed");
      assertEquals(entry.data?.status, 200);
      assertEquals(entry.data?.durationMs, 150);
      assertEquals(entry.data?.bytes, 1024);
    });

    it("should log AI calls", () => {
      const log = new Logger({ requestId: "req-123" });
      log.aiCall("openrouter", "gemini-flash", {
        inputTokens: 100,
        outputTokens: 200
      });

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      assertEquals(entry.message, "ai_call");
      assertEquals(entry.data?.provider, "openrouter");
      assertEquals(entry.data?.model, "gemini-flash");
      assertEquals(entry.data?.inputTokens, 100);
      assertEquals(entry.data?.outputTokens, 200);
    });

    it("should log database queries", () => {
      const log = new Logger({ requestId: "req-123" });
      log.dbQuery("chat_messages", "INSERT", 50, { rows: 1 });

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      assertEquals(entry.message, "db_query");
      assertEquals(entry.data?.table, "chat_messages");
      assertEquals(entry.data?.operation, "INSERT");
      assertEquals(entry.data?.durationMs, 50);
      assertEquals(entry.data?.rows, 1);
    });

    it("should log rate limit checks", () => {
      const log = new Logger({ requestId: "req-123" });
      log.rateLimit(false, 95, 100, { userType: "authenticated" });

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      assertEquals(entry.message, "rate_limit_check");
      assertEquals(entry.data?.exceeded, false);
      assertEquals(entry.data?.remaining, 95);
      assertEquals(entry.data?.total, 100);
      assertEquals(entry.data?.userType, "authenticated");
    });

    it("should log validation errors", () => {
      const log = new Logger({ requestId: "req-123" });
      log.validationError("email", "invalid_format", { value: "not-an-email" });

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      assertEquals(entry.message, "validation_error");
      assertEquals(entry.data?.field, "email");
      assertEquals(entry.data?.reason, "invalid_format");
      assertEquals(entry.data?.value, "not-an-email");
    });

    it("should log external API calls", () => {
      const log = new Logger({ requestId: "req-123" });
      log.externalApi("openrouter", "/chat/completions", 200, 350, {
        retries: 1
      });

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      assertEquals(entry.message, "external_api_call");
      assertEquals(entry.data?.service, "openrouter");
      assertEquals(entry.data?.endpoint, "/chat/completions");
      assertEquals(entry.data?.status, 200);
      assertEquals(entry.data?.durationMs, 350);
      assertEquals(entry.data?.retries, 1);
    });
  });

  describe("Factory Functions", () => {
    it("should create logger with context via createLogger", () => {
      const log = createLogger({ requestId: "req-123" });
      log.info("test_message");

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      assertEquals(entry.requestId, "req-123");
    });

    it("should export default logger without context", () => {
      logger.info("test_message");

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      assertEquals(entry.requestId, undefined);
      assertExists(entry.timestamp);
    });
  });

  describe("JSON Format Validation", () => {
    it("should produce valid JSON for all log levels", () => {
      const log = new Logger({ requestId: "req-123" });

      log.debug("test_debug");
      log.info("test_info");
      log.warn("test_warn");
      log.error("test_error", new Error("Test"));

      assertEquals(consoleOutput.length, 4);
      consoleOutput.forEach((output) => {
        // Should not throw when parsing
        JSON.parse(output);
      });
    });

    it("should handle special characters in messages", () => {
      const log = new Logger();
      log.info('test_with_"quotes"_and_\n_newlines');

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      assertEquals(entry.message, 'test_with_"quotes"_and_\n_newlines');
    });

    it("should handle complex nested data", () => {
      const log = new Logger();
      log.info("test_nested", {
        user: { id: "123", profile: { name: "Test" } },
        tags: ["a", "b", "c"],
        metadata: { count: 42, active: true }
      });

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      assertEquals(entry.data?.user, { id: "123", profile: { name: "Test" } });
      assertEquals(entry.data?.tags, ["a", "b", "c"]);
      assertEquals(entry.data?.metadata, { count: 42, active: true });
    });
  });

  describe("Timestamp Format", () => {
    it("should use ISO 8601 timestamp format", () => {
      const log = new Logger();
      log.info("test_message");

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      assertMatch(
        entry.timestamp,
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });

    it("should have timestamps in chronological order", () => {
      const log = new Logger();

      log.info("message_1");
      log.info("message_2");
      log.info("message_3");

      const timestamps = consoleOutput.map(
        (output) => JSON.parse(output).timestamp
      );
      for (let i = 1; i < timestamps.length; i++) {
        const current = new Date(timestamps[i]).getTime();
        const previous = new Date(timestamps[i - 1]).getTime();
        assertEquals(current >= previous, true);
      }
    });
  });
});
