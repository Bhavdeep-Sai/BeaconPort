const request = require("supertest");
const axios = require("axios");
const app = require("../app");
const { createMultiTenantFixtures } = require("./helpers/testData");
const aiTutorController = require("../controllers/aiTutorController");

describe("2.7 AI Tutor Security & Abuse Controls", () => {
  let fixtures;

  beforeEach(async () => {
    fixtures = await createMultiTenantFixtures();
    aiTutorController._resetDailyUsage();
    jest.clearAllMocks();
  });

  it("should reject empty or missing message with 400", async () => {
    const res = await request(app)
      .post("/api/ai-tutor/chat")
      .set("Authorization", `Bearer ${fixtures.tokens.studentA}`)
      .send({ message: "" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should reject message exceeding 1000 characters with 400", async () => {
    const longMessage = "a".repeat(1001);

    const res = await request(app)
      .post("/api/ai-tutor/chat")
      .set("Authorization", `Bearer ${fixtures.tokens.studentA}`)
      .send({ message: longMessage });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/1000 characters/i);
  });

  it("should not expose API key in URL query parameters and pass it via x-goog-api-key header", async () => {
    const axiosPostSpy = jest.spyOn(axios, "post").mockResolvedValueOnce({
      data: {
        candidates: [
          {
            content: {
              parts: [{ text: "Hello from mock AI tutor" }],
            },
          },
        ],
      },
    });

    const res = await request(app)
      .post("/api/ai-tutor/chat")
      .set("Authorization", `Bearer ${fixtures.tokens.studentA}`)
      .send({ message: "What is Newton's second law?" });

    expect(res.status).toBe(200);
    expect(axiosPostSpy).toHaveBeenCalledTimes(1);

    const [calledUrl, requestBody, requestConfig] = axiosPostSpy.mock.calls[0];

    // Assert API key is NEVER in URL
    expect(calledUrl).not.toContain("?key=");
    expect(calledUrl).not.toContain(process.env.GEMINI_API_KEY);

    // Assert API key is delivered via x-goog-api-key header
    expect(requestConfig.headers["x-goog-api-key"]).toBe(process.env.GEMINI_API_KEY);
    expect(calledUrl).toContain("gemini-1.5-flash");

    axiosPostSpy.mockRestore();
  });

  it("should enforce per-student daily quota of 50 messages", async () => {
    const axiosPostSpy = jest.spyOn(axios, "post").mockResolvedValue({
      data: {
        candidates: [
          {
            content: {
              parts: [{ text: "Mock response" }],
            },
          },
        ],
      },
    });

    // Make 50 requests
    for (let i = 0; i < 50; i++) {
      const res = await request(app)
        .post("/api/ai-tutor/chat")
        .set("Authorization", `Bearer ${fixtures.tokens.studentA}`)
        .send({ message: `Question ${i + 1}` });

      expect(res.status).toBe(200);
    }

    // 51st request should be rejected with 429
    const limitRes = await request(app)
      .post("/api/ai-tutor/chat")
      .set("Authorization", `Bearer ${fixtures.tokens.studentA}`)
      .send({ message: "51st Question" });

    expect(limitRes.status).toBe(429);
    expect(limitRes.body.message).toMatch(/daily.*quota/i);

    axiosPostSpy.mockRestore();
  });
});
