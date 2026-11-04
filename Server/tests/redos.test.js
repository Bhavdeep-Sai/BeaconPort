const request = require("supertest");
const app = require("../app");
const { createMultiTenantFixtures } = require("./helpers/testData");

describe("2.8 ReDoS Protection Across Search Queries", () => {
  let fixtures;

  beforeEach(async () => {
    fixtures = await createMultiTenantFixtures();
  });

  const maliciousPayloads = [
    "(a+)+$",
    "(a|aa)+$",
    "([a-zA-Z]+)*$",
    "((a+)*)+$",
    "[[[[[[[",
    "*****************",
  ];

  it("should safely handle catastrophic backtracking regex in notice search without hanging", async () => {
    for (const payload of maliciousPayloads) {
      const startTime = Date.now();
      const res = await request(app)
        .get(`/api/notice/all?search=${encodeURIComponent(payload)}`)
        .set("Authorization", `Bearer ${fixtures.tokens.schoolA}`);

      const duration = Date.now() - startTime;
      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(1000); // Must resolve in less than 1 second
    }
  });

  it("should safely handle malicious regex in teacher search without crashing or hanging", async () => {
    for (const payload of maliciousPayloads) {
      const startTime = Date.now();
      const res = await request(app)
        .get(`/api/teacher/fetch-with-query?search=${encodeURIComponent(payload)}`)
        .set("Authorization", `Bearer ${fixtures.tokens.schoolA}`);

      const duration = Date.now() - startTime;
      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(1000);
    }
  });

  it("should safely handle malicious regex in student search without crashing or hanging", async () => {
    for (const payload of maliciousPayloads) {
      const startTime = Date.now();
      const res = await request(app)
        .get(`/api/student/fetch-with-query?search=${encodeURIComponent(payload)}`)
        .set("Authorization", `Bearer ${fixtures.tokens.schoolA}`);

      const duration = Date.now() - startTime;
      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(1000);
    }
  });

  it("should safely handle malicious regex in AI tutor chat history search", async () => {
    for (const payload of maliciousPayloads) {
      const startTime = Date.now();
      const res = await request(app)
        .get(`/api/ai-tutor/chat-history?search=${encodeURIComponent(payload)}`)
        .set("Authorization", `Bearer ${fixtures.tokens.studentA}`);

      const duration = Date.now() - startTime;
      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(1000);
    }
  });
});

