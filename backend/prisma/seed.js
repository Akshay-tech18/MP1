const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seeding...");

  // 1. Delete all existing data
  await prisma.activityLog.deleteMany();
  await prisma.predictionResult.deleteMany();
  await prisma.pullRequest.deleteMany();
  await prisma.commit.deleteMany();
  await prisma.repository.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.sprint.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  console.log("Cleared existing database tables.");

  // 2. Create Users
  const admin = await prisma.user.create({
    data: {
      email: "admin@devpilot.com",
      name: "Alex Admin",
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Alex",
      role: "ADMIN",
      googleId: "google_admin_123",
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: "manager@devpilot.com",
      name: "Maria Manager",
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Maria",
      role: "MANAGER",
      googleId: "google_manager_123",
    },
  });

  const developer = await prisma.user.create({
    data: {
      email: "developer@devpilot.com",
      name: "Devon Developer",
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Devon",
      role: "DEVELOPER",
      googleId: "google_dev_123",
      githubId: "github_dev_123",
    },
  });

  const qa = await prisma.user.create({
    data: {
      email: "qa@devpilot.com",
      name: "Quinn QA",
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Quinn",
      role: "QA_TESTER",
      googleId: "google_qa_123",
    },
  });

  console.log("Seeded system-level users.");

  // 3. Create Project
  const project = await prisma.project.create({
    data: {
      name: "DevPilot Core Platform",
      description: "Building the AI-driven software project management workspace with deep git and ML integrations.",
      status: "ACTIVE",
      ownerId: manager.id,
    },
  });

  console.log(`Seeded Project: ${project.name}`);

  // 4. Create Project Members (Owner Maria is implicit manager, let's add others)
  await prisma.projectMember.createMany({
    data: [
      { projectId: project.id, userId: manager.id, role: "MANAGER" },
      { projectId: project.id, userId: developer.id, role: "DEVELOPER" },
      { projectId: project.id, userId: qa.id, role: "QA_TESTER" },
      { projectId: project.id, userId: admin.id, role: "MANAGER" }, // Admin gets Manager in project
    ],
  });

  console.log("Seeded project memberships.");

  // 5. Create Sprint
  const today = new Date();
  const twoWeeksLater = new Date();
  twoWeeksLater.setDate(today.getDate() + 14);

  const sprint = await prisma.sprint.create({
    data: {
      name: "Sprint 1 — Core Auth & RT Engine",
      goal: "Build Google & GitHub Passport flow, schema setup, and Socket.IO real-time channels.",
      status: "ACTIVE",
      startDate: today,
      endDate: twoWeeksLater,
      projectId: project.id,
    },
  });

  console.log(`Seeded Sprint: ${sprint.name}`);

  // 6. Create Tasks
  const task1 = await prisma.task.create({
    data: {
      title: "Implement Google OAuth Passport Strategy",
      description: "Setup passport-google-oauth20 middleware and handle auth callbacks safely.",
      priority: "CRITICAL",
      status: "COMPLETED",
      orderIndex: 1000.0,
      projectId: project.id,
      sprintId: sprint.id,
      reporterId: manager.id,
      assigneeId: developer.id,
    },
  });

  const task2 = await prisma.task.create({
    data: {
      title: "Configure Socket.IO Namespace rooms",
      description: "Set up the /project namespace, JWT validation handshake, and join_project rooms.",
      priority: "HIGH",
      status: "IN_PROGRESS",
      orderIndex: 2000.0,
      projectId: project.id,
      sprintId: sprint.id,
      reporterId: manager.id,
      assigneeId: developer.id,
    },
  });

  const task3 = await prisma.task.create({
    data: {
      title: "Verify bug prediction API outputs",
      description: "Test FastAPI integration /predict/batch endpoint with mock repository data.",
      priority: "MEDIUM",
      status: "TODO",
      orderIndex: 3000.0,
      projectId: project.id,
      sprintId: sprint.id,
      reporterId: manager.id,
      assigneeId: qa.id,
    },
  });

  const task4 = await prisma.task.create({
    data: {
      title: "Refactor database cascades on user deletion",
      description: "Ensure reported tasks block user deletes, while assigned tasks set assignee to null.",
      priority: "LOW",
      status: "BLOCKED",
      orderIndex: 4000.0,
      projectId: project.id,
      sprintId: sprint.id,
      reporterId: manager.id,
      assigneeId: developer.id,
    },
  });

  // Task 5 in Backlog (no sprintId)
  const task5 = await prisma.task.create({
    data: {
      title: "Design Analytics Dashboard UI",
      description: "Sketch chart elements for task completion distribution and code churn metrics.",
      priority: "LOW",
      status: "TODO",
      orderIndex: 1000.0,
      projectId: project.id,
      sprintId: null, // backlog
      reporterId: manager.id,
    },
  });

  console.log("Seeded tasks.");

  // 7. Seed Comments
  await prisma.taskComment.create({
    data: {
      content: "Almost done, just working on JWT token emission for Google strategy.",
      taskId: task1.id,
      userId: developer.id,
    },
  });

  await prisma.taskComment.create({
    data: {
      content: "Awesome, please ensure httpOnly cookies are set correctly.",
      taskId: task1.id,
      userId: manager.id,
    },
  });

  console.log("Seeded task comments.");

  // 8. Seed Repository
  const repository = await prisma.repository.create({
    data: {
      githubRepoId: "987654321",
      name: "devpilot-team/devpilot",
      owner: "devpilot-team",
      webhookSecret: "super_secret_webhook_key_123",
      projectId: project.id,
    },
  });

  console.log(`Seeded GitHub Repository: ${repository.name}`);

  // 9. Seed Commits (link to task1)
  await prisma.commit.create({
    data: {
      sha: "9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a10fe",
      message: `#TASK-${task1.taskNumber} Fix OAuth session callback and verify profile payload`,
      authorName: "Devon Developer",
      filesChanged: ["src/config/passport.js", "src/modules/auth/auth.controller.js"],
      committedAt: new Date(today.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
      repoId: repository.id,
      taskId: task1.id,
    },
  });

  await prisma.commit.create({
    data: {
      sha: "1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t",
      message: "Initial repository bootstrap with basic README",
      authorName: "Maria Manager",
      filesChanged: ["README.md"],
      committedAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      repoId: repository.id,
    },
  });

  console.log("Seeded repository commits.");

  // 10. Seed Pull Requests
  await prisma.pullRequest.create({
    data: {
      githubPrNumber: 1,
      title: "Feature: Google OAuth integration",
      state: "MERGED",
      mergedAt: new Date(today.getTime() - 12 * 60 * 60 * 1000),
      repoId: repository.id,
    },
  });

  await prisma.pullRequest.create({
    data: {
      githubPrNumber: 2,
      title: "WIP: Real-time Socket.IO event handler setup",
      state: "OPEN",
      repoId: repository.id,
    },
  });

  console.log("Seeded pull requests.");

  // 11. Seed Prediction Result
  await prisma.predictionResult.create({
    data: {
      filePath: "src/config/passport.js",
      commitFrequency: 3.5,
      codeChurn: 420.0,
      numContributors: 2,
      prCount: 1,
      bugFixRatio: 0.5,
      xgboostRisk: "MEDIUM",
      xgboostConfidence: 0.72,
      rfRisk: "LOW",
      rfConfidence: 0.61,
      agreement: false,
      repoId: repository.id,
    },
  });

  await prisma.predictionResult.create({
    data: {
      filePath: "src/modules/auth/auth.controller.js",
      commitFrequency: 8.2,
      codeChurn: 1840.0,
      numContributors: 3,
      prCount: 2,
      bugFixRatio: 0.75,
      xgboostRisk: "CRITICAL",
      xgboostConfidence: 0.94,
      rfRisk: "HIGH",
      rfConfidence: 0.88,
      agreement: false,
      repoId: repository.id,
    },
  });

  console.log("Seeded ML prediction results.");

  // 12. Seed Activity Logs
  await prisma.activityLog.create({
    data: {
      actionType: "TASK_CREATED",
      entityType: "TASK",
      entityId: task1.id,
      metadata: { title: task1.title },
      projectId: project.id,
      userId: manager.id,
      createdAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.activityLog.create({
    data: {
      actionType: "COMMIT_LINKED",
      entityType: "TASK",
      entityId: task1.id,
      metadata: { sha: "9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a10fe", message: "Fix OAuth session callback" },
      projectId: project.id,
      userId: developer.id,
      createdAt: new Date(today.getTime() - 24 * 60 * 60 * 1000),
    },
  });

  await prisma.activityLog.create({
    data: {
      actionType: "TASK_STATUS_CHANGED",
      entityType: "TASK",
      entityId: task1.id,
      metadata: { oldStatus: "IN_REVIEW", newStatus: "COMPLETED" },
      projectId: project.id,
      userId: manager.id,
      createdAt: new Date(today.getTime() - 12 * 60 * 60 * 1000),
    },
  });

  console.log("Seeded activity logs.");
  console.log("Database seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("Error seeding database: ", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
