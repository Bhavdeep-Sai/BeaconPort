const request = require("supertest");
const axios = require("axios");
const crypto = require("crypto");
const app = require("../app");
const School = require("../models/schoolModel");
const { createMultiTenantFixtures } = require("./helpers/testData");

jest.mock("axios");

describe("2.1 & 2.6: Authentication & Abuse Protection", () => {
  let fixtures;

  beforeEach(async () => {
    fixtures = await createMultiTenantFixtures();
    jest.clearAllMocks();
  });

  describe("Google OAuth Login (/api/school/login/oauth)", () => {
    it("should reject Google login when token is missing", async () => {
      const res = await request(app)
        .post("/api/school/login/oauth")
        .send({ email: fixtures.schoolA.email });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/token is required/i);
    });

    it("should reject Google login when Google returns invalid token error", async () => {
      axios.get.mockRejectedValueOnce({
        response: { status: 400, data: { error_description: "Invalid Value" } },
      });

      const res = await request(app)
        .post("/api/school/login/oauth")
        .send({ token: "invalid-token" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid or expired google token/i);
    });

    it("should reject Google login when token audience does not match GOOGLE_CLIENT_ID", async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          aud: "wrong-client-id.apps.googleusercontent.com",
          email: fixtures.schoolA.email,
          email_verified: "true",
          sub: "google-oauth-id-123",
        },
      });

      const res = await request(app)
        .post("/api/school/login/oauth")
        .send({ token: "token-with-wrong-aud" });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/audience mismatch/i);
    });

    it("should reject Google login when email is not verified by Google", async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          aud: process.env.GOOGLE_CLIENT_ID,
          email: fixtures.schoolA.email,
          email_verified: "false",
          sub: "google-oauth-id-123",
        },
      });

      const res = await request(app)
        .post("/api/school/login/oauth")
        .send({ token: "token-unverified-email" });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/email.*not verified/i);
    });

    it("should succeed and issue a JWT when Google token is valid and verified", async () => {
      // Mark schoolA as an OAuth user
      await School.findByIdAndUpdate(fixtures.schoolA._id, {
        isOAuthUser: true,
        oauthProvider: "google",
        oauthId: "google-sub-123",
      });

      axios.get.mockResolvedValueOnce({
        data: {
          aud: process.env.GOOGLE_CLIENT_ID,
          email: fixtures.schoolA.email,
          email_verified: "true",
          sub: "google-sub-123",
        },
      });

      const res = await request(app)
        .post("/api/school/login/oauth")
        .send({ token: "valid-google-token" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(fixtures.schoolA.email);
    });
  });

  describe("Generic Error Messages (User Enumeration Prevention)", () => {
    it("should return generic error for non-existent school email", async () => {
      const res = await request(app)
        .post("/api/school/login")
        .send({ email: "nonexistent@school.edu", password: "somePassword123" });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid email or password");
    });

    it("should return generic error for wrong school password", async () => {
      const res = await request(app)
        .post("/api/school/login")
        .send({ email: fixtures.schoolA.email, password: "wrongPassword" });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid email or password");
    });

    it("should return generic error for wrong teacher email or password", async () => {
      const res = await request(app)
        .post("/api/teacher/login")
        .send({ email: "wrong@teacher.com", password: "bad" });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid email or password");
    });

    it("should return generic error for wrong student email or password", async () => {
      const res = await request(app)
        .post("/api/student/login")
        .send({ email: "wrong@student.com", password: "bad" });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid email or password");
    });
  });

  describe("Password Reset Token Hashing", () => {
    it("should store a SHA-256 hash of reset token in database, not raw token", async () => {
      const res = await request(app)
        .post("/api/school/forgot-password")
        .send({ email: fixtures.schoolA.email });

      expect(res.status).toBe(200);

      const school = await School.findById(fixtures.schoolA._id);
      expect(school.resetPasswordToken).toBeDefined();
      expect(school.resetPasswordToken).not.toBeNull();
      // SHA-256 hex string is 64 characters
      expect(school.resetPasswordToken.length).toBe(64);
      expect(/^[a-f0-9]{64}$/.test(school.resetPasswordToken)).toBe(true);
    });
  });

  describe("Rate Limiting", () => {
    it("should return 429 when authentication rate limit is exceeded", async () => {
      const testIp = "203.0.113.199";
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post("/api/school/login")
          .set("X-Forwarded-For", testIp)
          .send({ email: "test@limit.com", password: "pwd" });
      }

      // 6th attempt should be blocked with 429
      const blockedRes = await request(app)
        .post("/api/school/login")
        .set("X-Forwarded-For", testIp)
        .send({ email: "test@limit.com", password: "pwd" });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.message).toMatch(/too many.*attempts/i);
    });
  });
});

