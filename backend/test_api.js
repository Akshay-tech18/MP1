const axios = require("axios");

const BASE_URL = "http://localhost:5001";

async function runTests() {
  console.log("=== Starting DevPilot Backend API Integration Tests ===");
  
  try {
    // 1. Check health endpoint
    console.log("\n1. Testing health probes...");
    const healthRes = await axios.get(`${BASE_URL}/health`);
    console.log(`   - Liveness Check: ${healthRes.data.message}`);

    const dbHealthRes = await axios.get(`${BASE_URL}/health/db`);
    console.log(`   - DB Readiness Check: ${dbHealthRes.data.message}`);

    // 2. Perform Mock Login
    console.log("\n2. Testing Mock Login...");
    const loginRes = await axios.post(`${BASE_URL}/api/auth/mock-login`, {
      email: "manager@devpilot.com"
    });
    
    if (!loginRes.data.success) {
      throw new Error("Mock login failed");
    }

    const { accessToken, user } = loginRes.data.data;
    console.log(`   - Logged in successfully as: ${user.name} (${user.role})`);
    
    // Set default headers for subsequent requests
    const headers = {
      Authorization: `Bearer ${accessToken}`
    };

    // 3. Fetch Profile /auth/me
    console.log("\n3. Verifying /auth/me profile retrieve...");
    const meRes = await axios.get(`${BASE_URL}/api/auth/me`, { headers });
    console.log(`   - Verified profile for: ${meRes.data.data.user.name}`);

    // 4. Retrieve Projects list
    console.log("\n4. Retrieving Projects...");
    const projectsRes = await axios.get(`${BASE_URL}/api/projects`, { headers });
    const projects = projectsRes.data.data.projects;
    console.log(`   - Found ${projects.length} project(s).`);
    
    if (projects.length === 0) {
      throw new Error("No projects found, check seeding.");
    }

    const project = projects[0];
    const projectId = project.id;
    console.log(`   - Using project: "${project.name}" (ID: ${projectId})`);

    // 5. Check Project progress calculation
    console.log("\n5. Checking project progress calculation...");
    const progressRes = await axios.get(`${BASE_URL}/api/projects/${projectId}/progress`, { headers });
    console.log(`   - Calculated progress: ${progressRes.data.data.progress}%`);

    // 6. Create a Task
    console.log("\n6. Creating a new Task...");
    const createTaskRes = await axios.post(
      `${BASE_URL}/api/projects/${projectId}/tasks`,
      {
        title: "Verify API integration flows",
        description: "Verify that creating, commenting, and reordering tasks works correctly via API.",
        priority: "HIGH",
        status: "TODO"
      },
      { headers }
    );
    const task = createTaskRes.data.data.task;
    const taskId = task.id;
    console.log(`   - Task created: "${task.title}" (ID: ${taskId}, Priority: ${task.priority})`);

    // 7. Post a Comment on the Task
    console.log("\n7. Adding a comment to the Task...");
    const commentRes = await axios.post(
      `${BASE_URL}/api/projects/${projectId}/tasks/${taskId}/comments`,
      {
        content: "API integration verification is running smoothly!"
      },
      { headers }
    );
    console.log(`   - Comment added: "${commentRes.data.data.comment.content}"`);

    // 8. Reorder Task on the Kanban Board
    console.log("\n8. Reordering the Task on the Kanban Board...");
    const reorderRes = await axios.patch(
      `${BASE_URL}/api/projects/${projectId}/tasks/reorder`,
      {
        updates: [
          {
            id: taskId,
            orderIndex: 2500.0,
            status: "IN_PROGRESS"
          }
        ]
      },
      { headers }
    );
    console.log(`   - Kanban Reorder Status: ${reorderRes.data.message}`);

    // Verify task status was updated
    const taskDetailsRes = await axios.get(`${BASE_URL}/api/projects/${projectId}/tasks/${taskId}`, { headers });
    console.log(`   - Verified task status moved to: ${taskDetailsRes.data.data.task.status}`);

    // 9. Query Project Dashboard Analytics
    console.log("\n9. Testing Dashboard Analytics aggregation...");
    const analyticsRes = await axios.get(`${BASE_URL}/api/projects/${projectId}/analytics/dashboard`, { headers });
    const { statusDistribution, activeSprint, bugRiskSummary } = analyticsRes.data.data;
    console.log("   - Task Status distribution: ", JSON.stringify(statusDistribution));
    console.log("   - Active Sprint: ", activeSprint ? activeSprint.name : "None");
    console.log("   - Bug Risk summary: ", JSON.stringify(bugRiskSummary));

    console.log("\n🎉 === All Backend API Integration Tests Passed Successfully! ===");
    process.exit(0);

  } catch (error) {
    console.error("\n❌ Test Suite Failed!");
    if (error.response) {
      console.error(`   - Status Code: ${error.response.status}`);
      console.error("   - Response Error: ", JSON.stringify(error.response.data));
    } else {
      console.error(`   - Error Message: ${error.message}`);
    }
    process.exit(1);
  }
}

// Run the suite
runTests();
