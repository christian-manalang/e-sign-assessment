import { describe, expect, it } from "bun:test";
import { app } from "../src/index";

describe("E-Sign API Core Endpoints", () => {
  
  it("GET /api/document/:id should return 404 for an invalid UUID", async () => {
    const response = await app.handle(
      new Request("http://localhost/api/document/00000000-0000-0000-0000-000000000000")
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  it("POST /api/request should fail (422) if required fields are missing", async () => {
    const response = await app.handle(
      new Request("http://localhost/api/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(422);
  });

  it("POST /api/sign/:id should return 404 for a non-existent document ID", async () => {
    const nonExistentId = "ffffffff-ffff-ffff-ffff-ffffffffffff";
    
    const mockPayload = {
      signatures: [
        {
          image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
          x: 100,
          y: 100,
          scale: 1,
          pageNumber: 1,
          renderedWidth: 500,
          mode: "draw"
        }
      ]
    };

    const response = await app.handle(
      new Request(`http://localhost/api/sign/${nonExistentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockPayload),
      })
    );

    expect(response.status).toBe(404);
  });
});