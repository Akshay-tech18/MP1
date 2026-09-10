const request = require("supertest");
const app = require("../app");

describe("Health Check API", () => {
  it("should return healthy status", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Server is online and healthy");
  });
});
