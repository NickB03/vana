import { describe, it, expect, beforeEach, afterEach } from "https://deno.land/std@0.168.0/testing/bdd.ts";
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

      expect(consoleOutput.length).toBe(1);
      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      expect(entry.level).toBe("debug");
      expect(entry.message).toBe("test_debug");
      expect(entry.data?.foo).toBe("bar");
      expect(entry.timestamp).toBeDefined();
    });

    it("should log info messages", () => {
      const log = new Logger();
      log.info("test_info", { count: 42 });

      expect(consoleOutput.length).toBe(1);
      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      expect(entry.level).toBe("info");
      expect(entry.message).toBe("test_info");
      expect(entry.data?.count).toBe(42);
    });

    it("should log warn messages", () => {
      const log = new Logger();
      log.warn("test_warn", { reason: "deprecated" });

      expect(consoleOutput.length).toBe(1);
      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      expect(entry.level).toBe("warn");
      expect(entry.message).toBe("test_warn");
      expect(entry.data?.reason).toBe("deprecated");
    });

    it("should log error messages with stack traces", () => {
      const log = new Logger();
      const error = new Error("Test error");
      log.error("test_error", error, { operation: "test" });

      expect(consoleOutput.length).toBe(1);
      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      expect(entry.level).toBe("error");
      expect(entry.message).toBe("test_error");
      expect(entry.error?.name).toBe("Error");
      expect(entry.error?.message).toBe("Test error");
      expect(entry.error?.stack).toBeDefined();
      expect(entry.data?.operation).toBe("test");
    });
  });

  describe("Context Injection", () => {
    it("should include requestId in all logs", () => {
      const log = new Logger({ requestId: "req-123" });
      log.info("test_message");

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      expect(entry.requestId).toBe("req-123");
    });

    it("should include userId in all logs", () => {
      const log = new Logger({ userId: "user-456" });
      log.info("test_message");

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      expect(entry.userId).toBe("user-456");
    });

    it("should include sessionId in all logs", () => {
      const log = new Logger({ sessionId: "session-789" });
      log.info("test_message");

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      expect(entry.sessionId).toBe("session-789");
    });

    it("should include all context fields", () => {
      const context: LoggerContext = {
        requestId: "req-123",
        userId: "user-456",
        sessionId: "session-789",
        functionName: "chat"
      };
      const log = new Logger(context);
      log.info("test_message");

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      expect(entry.requestId).toBe("req-123");
      expect(entry.userId).toBe("user-456");
      expect(entry.sessionId).toBe("session-789");
      expect(entry.functionName).toBe("chat");
    });
  });

  describe("Child Logger", () => {
    it("should inherit parent context", () => {
      const parent = new Logger({ requestId: "req-123" });
      const child = parent.child({ userId: "user-456" });
      child.info("test_message");

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      expect(entry.requestId).toBe("req-123");
      expect(entry.userId).toBe("user-456");
    });

    it("should override parent context", () => {
      const parent = new Logger({ requestId: "req-123", userId: "user-old" });
      const child = parent.child({ userId: "user-new" });
      child.info("test_message");

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      expect(entry.requestId).toBe("req-123");
      expect(entry.userId).toBe("user-new");
    });

    it("should not affect parent logger", () => {
      const parent = new Logger({ requestId: "req-123" });
      const child = parent.child({ userId: "user-456" });

      parent.info("parent_message");
      const parentEntry = JSON.parse(consoleOutput[0]) as LogEntry;
      expect(parentEntry.userId).toBeUndefined();

      child.info("child_message");
      const childEntry = JSON.parse(consoleOutput[1]) as LogEntry;
      expect(childEntry.userId).toBe("user-456");
    });
  });

  describe("Specialized Logging Methods", () => {
    it("should log request details", () => {
      const log = new Logger({ requestId: "req-123" });
      log.request("POST", "/chat", { body: "test" });

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      expect(entry.message).toBe("request_received");
      expect(entry.data?.method).toBe("POST");
      expect(entry.data?.path).toBe("/chat");
      expect(entry.data?.body).toBe("test");
    });

    it("should log response details", () => {
      const log = new Logger({ requestId: "req-123" });
      log.response(200, 150, { bytes: 1024 });

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      expect(entry.message).toBe("request_completed");
      expect(entry.data?.status).toBe(200);
      expect(entry.data?.durationMs).toBe(150);
      expect(entry.data?.bytes).toBe(1024);
    });

    it("should log AI calls", () => {
      const log = new Logger({ requestId: "req-123" });
      log.aiCall("openrouter", "gemini-flash", {
        inputTokens: 100,
        outputTokens: 200
      });

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      expect(entry.message).toBe("ai_call");
      expect(entry.data?.provider).toBe("openrouter");
      expect(entry.data?.model).toBe("gemini-flash");
      expect(entry.data?.inputTokens).toBe(100);
      expect(entry.data?.outputTokens).toBe(200);
    });

    it("should log database queries", () => {
      const log = new Logger({ requestId: "req-123" });
      log.dbQuery("chat_messages", "INSERT", 50, { rows: 1 });

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      expect(entry.message).toBe("db_query");
      expect(entry.data?.table).toBe("chat_messages");
      expect(entry.data?.operation).toBe("INSERT");
      expect(entry.data?.durationMs).toBe(50);
      expect(entry.data?.rows).toBe(1);
    });

    it("should log rate limit checks", () => {
      const log = new Logger({ requestId: "req-123" });
      log.rateLimit(false, 95, 100, { userType: "authenticated" });

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      expect(entry.message).toBe("rate_limit_check");
      expect(entry.data?.exceeded).toBe(false);
      expect(entry.data?.remaining).toBe(95);
      expect(entry.data?.total).toBe(100);
      expect(entry.data?.userType).toBe("authenticated");
    });

    it("should log validation errors", () => {
      const log = new Logger({ requestId: "req-123" });
      log.validationError("email", "invalid_format", { value: "not-an-email" });

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      expect(entry.message).toBe("validation_error");
      expect(entry.data?.field).toBe("email");
      expect(entry.data?.reason).toBe("invalid_format");
      expect(entry.data?.value).toBe("not-an-email");
    });

    it("should log external API calls", () => {
      const log = new Logger({ requestId: "req-123" });
      log.externalApi("openrouter", "/chat/completions", 200, 350, {
        retries: 1
      });

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      expect(entry.message).toBe("external_api_call");
      expect(entry.data?.service).toBe("openrouter");
      expect(entry.data?.endpoint).toBe("/chat/completions");
      expect(entry.data?.status).toBe(200);
      expect(entry.data?.durationMs).toBe(350);
      expect(entry.data?.retries).toBe(1);
    });
  });

  describe("Factory Functions", () => {
    it("should create logger with context via createLogger", () => {
      const log = createLogger({ requestId: "req-123" });
      log.info("test_message");

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      expect(entry.requestId).toBe("req-123");
    });

    it("should export default logger without context", () => {
      logger.info("test_message");

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      expect(entry.requestId).toBeUndefined();
      expect(entry.timestamp).toBeDefined();
    });
  });

  describe("JSON Format Validation", () => {
    it("should produce valid JSON for all log levels", () => {
      const log = new Logger({ requestId: "req-123" });

      log.debug("test_debug");
      log.info("test_info");
      log.warn("test_warn");
      log.error("test_error", new Error("Test"));

      expect(consoleOutput.length).toBe(4);
      consoleOutput.forEach((output) => {
        expect(() => JSON.parse(output)).not.toThrow();
      });
    });

    it("should handle special characters in messages", () => {
      const log = new Logger();
      log.info('test_with_"quotes"_and_\n_newlines');

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      expect(entry.message).toBe('test_with_"quotes"_and_\n_newlines');
    });

    it("should handle complex nested data", () => {
      const log = new Logger();
      log.info("test_nested", {
        user: { id: "123", profile: { name: "Test" } },
        tags: ["a", "b", "c"],
        metadata: { count: 42, active: true }
      });

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      expect(entry.data?.user).toEqual({ id: "123", profile: { name: "Test" } });
      expect(entry.data?.tags).toEqual(["a", "b", "c"]);
      expect(entry.data?.metadata).toEqual({ count: 42, active: true });
    });
  });

  describe("Timestamp Format", () => {
    it("should use ISO 8601 timestamp format", () => {
      const log = new Logger();
      log.info("test_message");

      const entry = JSON.parse(consoleOutput[0]) as LogEntry;
      expect(entry.timestamp).toMatch(
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
        expect(new Date(timestamps[i]).getTime()).toBeGreaterThanOrEqual(
          new Date(timestamps[i - 1]).getTime()
        );
      }
    });
  });
});
