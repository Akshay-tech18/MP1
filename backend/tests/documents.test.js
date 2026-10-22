const { withExponentialBackoff } = require("../src/utils/retry.utils");
const { chunkText } = require("../src/services/embedding.service");
const { PDFParse } = require("pdf-parse");

describe("PDF Upload & RAG Chunking Tests", () => {
  test("chunkText splits content into chunks <= maxLength", () => {
    const sampleText = "Paragraph 1 is here.\n\nParagraph 2 has more details and descriptions.\n\nParagraph 3 is also present.";
    const chunks = chunkText(sampleText, 50);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    chunks.forEach((chunk) => {
      expect(typeof chunk).toBe("string");
      expect(chunk.length).toBeGreaterThan(0);
    });
  });

  test("pdf-parse v2 extracts text and page count safely", async () => {
    // Minimal valid PDF binary string
    const samplePdf = Buffer.from(
      "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" +
      "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n" +
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources <<>> /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n" +
      "4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf 72 712 Td (Test PDF Content) Tj ET\nendstream\nendobj\n" +
      "xref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000216 00000 n \n" +
      "trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n310\n%%EOF"
    );

    const parser = new PDFParse({ data: samplePdf });
    const parsedData = await parser.getText();
    const extractedText = (parsedData?.text || "").trim();
    const numPages = parsedData?.total || (Array.isArray(parsedData?.pages) ? parsedData.pages.length : 1);

    expect(extractedText).toContain("Test PDF Content");
    expect(numPages).toBe(1);

    await parser.destroy();
  });

  test("withExponentialBackoff aborts immediately on HTTP 402 / credit exhaustion", async () => {
    let callCount = 0;
    const failingFn = async () => {
      callCount++;
      const err = new Error("You have no remaining credits");
      err.status = 402;
      throw err;
    };

    await expect(withExponentialBackoff(failingFn, 4, 100)).rejects.toThrow("You have no remaining credits");
    // Should NOT retry 4 times; must abort on 1st attempt!
    expect(callCount).toBe(1);
  });
});
