require('dotenv').config();
const prisma = require("./src/config/db");
const { getDocuments, createDocument } = require("./src/modules/documents/document.controller");
const assert = require("assert");

(async () => {
  try {
    console.log("Starting backend tests...");

    // 1. Create a mock user & project
    const user = await prisma.user.create({
      data: {
        email: "test_nexus_agent@example.com",
        name: "Test User"
      }
    });
    console.log("Mock user created:", user.id);

    const project = await prisma.project.create({
      data: {
        name: "Test Project",
        ownerId: user.id
      }
    });
    console.log("Mock project created:", project.id);

    // 2. Test createDocument Controller
    let resData = null;
    const mockRes = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { resData = data; return this; }
    };
    
    const mockReq = {
      params: { projectId: project.id },
      body: { title: "Test Doc", content: "This is a test document to see if word count works." },
      user: { id: user.id }
    };

    await createDocument(mockReq, mockRes);
    
    assert.strictEqual(resData.success, true);
    assert.strictEqual(resData.data.document.title, "Test Doc");
    assert.strictEqual(resData.data.document.readTime, 1); // < 200 words
    console.log("✅ createDocument test passed");
    
    const docId = resData.data.document.id;

    // 3. Test getDocuments (list view exclusion of content)
    let listResData = null;
    const mockListRes = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { listResData = data; return this; }
    };
    const mockListReq = {
      params: { projectId: project.id },
      query: { search: "Test" }
    };

    await getDocuments(mockListReq, mockListRes);
    assert.strictEqual(listResData.success, true);
    assert.strictEqual(listResData.data.documents.length, 1);
    assert.strictEqual(listResData.data.documents[0].content, undefined); // Content should be excluded
    console.log("✅ getDocuments test passed");

    // Clean up
    await prisma.project.delete({ where: { id: project.id } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log("Cleanup successful");
    
    console.log("All Document tests passed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
})();
