const crypto = require("crypto");
const { Octokit } = require("@octokit/rest");
const { decrypt } = require("../../utils/crypto.utils");
const prisma = require("../../config/db");
const { sendSuccess, sendError } = require("../../utils/response.utils");
const { TaskPriorityWeight, SocketEvent, ActivityType } = require("../../config/constants");
const logger = require("../../utils/logger");
const { syncCommitsForRepository } = require("../github/github.service");

/**
 * Helper to emit socket events
 */
const emitToProject = (req, projectId, event, data) => {
  const io = req.app.get("io");
  if (io) {
    io.of("/project").to(projectId).emit(event, data);
  }
};

/**
 * Create a new project, link repo, and invite members
 */
const createProject = async (req, res) => {
  const { name, description, status, repoName, invitees } = req.body;
  const ownerId = req.user.id;
  const warnings = [];

  try {
    // We need owner details to send emails "on behalf of"
    const ownerDetails = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { name: true, email: true, githubToken: true }
    });

    const project = await prisma.$transaction(async (tx) => {
      // 1. Create the project
      const proj = await tx.project.create({
        data: {
          name,
          description,
          status: status || "PLANNING",
          ownerId
        }
      });

      // 2. Add owner as a project member with role MANAGER
      await tx.projectMember.create({
        data: {
          projectId: proj.id,
          userId: ownerId,
          role: "MANAGER"
        }
      });

      // 3. Process Invitees within transaction (only DB parts)
      if (invitees && Array.isArray(invitees) && invitees.length > 0) {
        const processedEmails = new Set();
        if (ownerDetails && ownerDetails.email) {
          processedEmails.add(ownerDetails.email.toLowerCase().trim());
        }

        for (const invitee of invitees) {
          const rawEmail = typeof invitee === "string" ? invitee : invitee?.email;
          const role = (typeof invitee === "object" && invitee?.role) ? invitee.role : "DEVELOPER";
          if (!rawEmail) continue;
          
          const email = rawEmail.trim().toLowerCase();
          if (processedEmails.has(email)) continue;
          processedEmails.add(email);
          
          const targetUser = await tx.user.findFirst({
            where: { email: { equals: email, mode: "insensitive" } }
          });
          
          if (targetUser) {
            // Owner is already added as MANAGER, skip to prevent unique constraint conflict
            if (targetUser.id === ownerId) {
              continue;
            }
            // Existing user -> Add immediately
            await tx.projectMember.create({
              data: { projectId: proj.id, userId: targetUser.id, role: role || "DEVELOPER" }
            });
            // Create in-app notification
            await tx.notification.create({
              data: {
                userId: targetUser.id,
                title: "Added to Workspace",
                message: `${ownerDetails?.name || "A workspace manager"} added you to the workspace '${name}' as ${role || "DEVELOPER"}.`,
                link: `/dashboard`
              }
            });
          } else {
            // Non-existing user -> Create Pending Invite
            const inviteId = crypto.randomUUID();
            const token = crypto.randomBytes(20).toString('hex');
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry
            
            await tx.$executeRaw`
              INSERT INTO pending_invites (id, email, "projectId", role, token, status, "createdAt", "expiresAt")
              VALUES (${inviteId}, ${email}, ${proj.id}, ${role || "DEVELOPER"}::"ProjectRole", ${token}, 'PENDING'::"InviteStatus", NOW(), ${expiresAt})
            `;
          }
        }
      }
      return proj;
    });

    // 4. Handle Repo Linking (Outside transaction to avoid blocking DB on network calls)
    if (repoName) {
      let fullRepoName = repoName.trim();
      let repoOwner = "";
      let repo = "";

      if (ownerDetails && ownerDetails.githubToken) {
        try {
          const decryptedToken = decrypt(ownerDetails.githubToken);
          const octokit = new Octokit({ auth: decryptedToken });

          // If no slash, resolve owner from the authenticated GitHub user
          if (!fullRepoName.includes("/")) {
            try {
              const { data: ghUser } = await octokit.users.getAuthenticated();
              repoOwner = ghUser.login;
              repo = fullRepoName;
              fullRepoName = `${repoOwner}/${repo}`;
            } catch (e) {
              logger.warn("Could not fetch authenticated user login for repo %s: %s", fullRepoName, e.message);
            }
          } else {
            [repoOwner, repo] = fullRepoName.split("/");
          }

          if (repoOwner && repo) {
            const webhookSecret = crypto.randomBytes(32).toString("hex");
            const callbackUrl = process.env.GITHUB_WEBHOOK_URL || `${req.protocol}://${req.get("host")}/api/webhooks/github`;

            let repoDetails = null;
            try {
              const response = await octokit.repos.get({ owner: repoOwner, repo });
              repoDetails = response.data;
            } catch (apiErr) {
              logger.warn("Could not fetch remote repo details from GitHub for %s/%s: %s", repoOwner, repo, apiErr.message);
            }

            // Register Webhook (using modern createWebhook or fallback to createHook)
            try {
              if (typeof octokit.repos.createWebhook === "function") {
                await octokit.repos.createWebhook({
                  owner: repoOwner,
                  repo,
                  name: "web",
                  active: true,
                  events: ["push", "pull_request"],
                  config: {
                    url: callbackUrl,
                    content_type: "json",
                    secret: webhookSecret,
                  },
                });
              } else if (typeof octokit.repos.createHook === "function") {
                await octokit.repos.createHook({
                  owner: repoOwner,
                  repo,
                  name: "web",
                  active: true,
                  events: ["push", "pull_request"],
                  config: {
                    url: callbackUrl,
                    content_type: "json",
                    secret: webhookSecret,
                  },
                });
              }
            } catch (hookErr) {
              logger.warn("GitHub Webhook registration skipped or failed: %s", hookErr.message);
            }

            // Store repository record in DB with upsert to prevent unique constraint conflict
            const repoIdStr = repoDetails ? String(repoDetails.id) : String(Math.floor(Math.random() * 100000000));
            const dbRepo = await prisma.repository.upsert({
              where: { githubRepoId: repoIdStr },
              update: {
                name: fullRepoName,
                owner: repoOwner,
                webhookSecret,
                projectId: project.id,
              },
              create: {
                githubRepoId: repoIdStr,
                name: fullRepoName,
                owner: repoOwner,
                webhookSecret,
                projectId: project.id,
              },
            });
            logger.info(`Repository '${fullRepoName}' successfully linked to workspace '${project.id}'`);

            // Immediately sync initial commits for the linked repository in background
            syncCommitsForRepository(dbRepo.id, ownerId).catch((err) => {
              logger.warn("Initial commit sync failed for %s: %s", fullRepoName, err.message);
            });
          }
        } catch (repoErr) {
          logger.error("Failed to link repository during project creation: %o", repoErr);
          warnings.push(`Repository not linked: ${repoErr.message || "GitHub API Error"}`);
        }
      } else {
        // Fallback for development without GitHub token
        if (process.env.NODE_ENV !== "production") {
          logger.warn("No GitHub token found for user. Creating a mock repository in development mode.");
          const [owner, simpleRepo] = fullRepoName.includes("/") ? fullRepoName.split("/") : ["dev", fullRepoName];
          const mockRepoId = String(Math.floor(Math.random() * 100000000));
          await prisma.repository.upsert({
            where: { githubRepoId: mockRepoId },
            update: {
              name: fullRepoName,
              owner,
              webhookSecret: crypto.randomBytes(32).toString("hex"),
              projectId: project.id,
            },
            create: {
              githubRepoId: mockRepoId,
              name: fullRepoName,
              owner,
              webhookSecret: crypto.randomBytes(32).toString("hex"),
              projectId: project.id,
            },
          });
        } else {
          warnings.push("Repository not linked: Please authenticate with GitHub first.");
        }
      }
    }

    // 5. Send out email invitations and WebSocket notifications asynchronously
    if (invitees && Array.isArray(invitees)) {
      const io = req.app.get("io");
      invitees.forEach(async (invitee) => {
        const rawEmail = typeof invitee === "string" ? invitee : invitee?.email;
        if (!rawEmail) return;
        const email = rawEmail.trim().toLowerCase();
        const targetUser = await prisma.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } }
        });
        if (targetUser && io) {
          // Emit real-time notification
          io.of("/project").to(`user:${targetUser.id}`).emit("notification:new", {
            title: "Added to Workspace",
            message: `${ownerDetails.name} added you to '${name}'.`
          });
        } else if (!targetUser) {
          // TODO: Send email using Nodemailer (with Reply-To: ownerDetails.email)
          logger.info(`[Email Stub] Sending invite to ${email} on behalf of ${ownerDetails.email}`);
        }
      });
    }

    const fullProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } }
          }
        },
        repositories: {
          select: { id: true, name: true, owner: true, createdAt: true }
        },
        pendingInvites: {
          select: { id: true, email: true, role: true, status: true, createdAt: true }
        },
        _count: {
          select: { members: true, tasks: true }
        }
      }
    });

    return sendSuccess(res, 201, "Project created successfully", { project: fullProject || project, warnings });
  } catch (error) {
    logger.error("Project creation error: %o", error);
    return sendError(res, 500, "Failed to create project");
  }
};

/**
 * List all projects the user is affiliated with
 */
const listProjects = async (req, res) => {
  const userId = req.user.id;

  try {
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } }
        ]
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        _count: {
          select: { members: true, tasks: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return sendSuccess(res, 200, "Projects retrieved", { projects });
  } catch (error) {
    logger.error("List projects error: %o", error);
    return sendError(res, 500, "Failed to retrieve projects");
  }
};

/**
 * Get project details by ID
 */
const getProject = async (req, res) => {
  const projectId = req.params.id;

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } }
          }
        },
        repositories: {
          select: { id: true, name: true, owner: true, createdAt: true }
        },
        pendingInvites: {
          select: { id: true, email: true, role: true, status: true, createdAt: true }
        },
        _count: {
          select: { members: true, tasks: true }
        }
      }
    });

    if (!project) {
      return sendError(res, 404, "Project not found");
    }

    return sendSuccess(res, 200, "Project retrieved successfully", { project });
  } catch (error) {
    logger.error("Get project error: %o", error);
    return sendError(res, 500, "Failed to retrieve project details");
  }
};

/**
 * Update project details (Manager only)
 */
const updateProject = async (req, res) => {
  const projectId = req.params.id;
  const { name, description, status } = req.body;

  try {
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        name: name || undefined,
        description: description !== undefined ? description : undefined,
        status: status || undefined
      }
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        actionType: ActivityType.PROJECT_UPDATED,
        entityType: "PROJECT",
        entityId: projectId,
        metadata: { changes: req.body },
        projectId,
        userId: req.user.id
      }
    });

    // Broadcast change
    emitToProject(req, projectId, SocketEvent.PROJECT_UPDATED, updatedProject);

    return sendSuccess(res, 200, "Project updated successfully", { project: updatedProject });
  } catch (error) {
    logger.error("Update project error: %o", error);
    return sendError(res, 500, "Failed to update project");
  }
};

/**
 * Delete project (Owner or System Admin only)
 */
const deleteProject = async (req, res) => {
  const projectId = req.params.id;

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true }
    });

    if (!project) {
      return sendError(res, 404, "Project not found");
    }

    // Allow if project owner or system ADMIN
    if (project.ownerId !== req.user.id && req.user.role !== "ADMIN") {
      return sendError(res, 403, "Access denied. Only the project owner can delete a project.");
    }

    await prisma.project.delete({
      where: { id: projectId }
    });

    // Notify connected project members
    emitToProject(req, projectId, SocketEvent.PROJECT_UPDATED, { id: projectId, deleted: true });

    return sendSuccess(res, 200, "Project and all associated data deleted successfully");
  } catch (error) {
    logger.error("Delete project error: %o", error);
    return sendError(res, 500, "Failed to delete project");
  }
};

/**
 * Add a member to a project (by userId or email)
 */
const addMember = async (req, res) => {
  const projectId = req.params.id;
  const { userId, email, role = "DEVELOPER" } = req.body;

  try {
    let targetUser = null;

    if (userId) {
      targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, avatar: true }
      });
      if (!targetUser) {
        return sendError(res, 404, "Target user not found");
      }
    } else if (email) {
      const cleanEmail = email.trim().toLowerCase();
      targetUser = await prisma.user.findFirst({
        where: { email: { equals: cleanEmail, mode: "insensitive" } },
        select: { id: true, name: true, email: true, avatar: true }
      });

      // If user does not have an account yet, create a pending invite
      if (!targetUser) {
        const inviteId = crypto.randomUUID();
        const token = crypto.randomBytes(20).toString("hex");
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await prisma.$executeRaw`
          INSERT INTO pending_invites (id, email, "projectId", role, token, status, "createdAt", "expiresAt")
          VALUES (${inviteId}, ${cleanEmail}, ${projectId}, ${role}::"ProjectRole", ${token}, 'PENDING'::"InviteStatus", NOW(), ${expiresAt})
        `;

        const invite = {
          id: inviteId,
          email: cleanEmail,
          role,
          status: "PENDING",
          createdAt: new Date()
        };

        // Broadcast change
        emitToProject(req, projectId, SocketEvent.MEMBER_ADDED, { isPending: true, invite });

        return sendSuccess(res, 201, `Invitation sent to ${cleanEmail}`, { invite, isPending: true });
      }
    } else {
      return sendError(res, 400, "Either userId or email is required");
    }

    // Add or update project membership for existing user
    const member = await prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUser.id
        }
      },
      update: { role },
      create: {
        projectId,
        userId: targetUser.id,
        role
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } }
      }
    });

    // Create in-app notification
    await prisma.notification.create({
      data: {
        userId: targetUser.id,
        title: "Added to Workspace",
        message: `${req.user.name} added you to the workspace as ${role}.`,
        link: `/dashboard`
      }
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        actionType: ActivityType.MEMBER_ADDED,
        entityType: "MEMBER",
        entityId: targetUser.id,
        metadata: { name: targetUser.name, role },
        projectId,
        userId: req.user.id
      }
    });

    // Broadcast change
    emitToProject(req, projectId, SocketEvent.MEMBER_ADDED, member);

    return sendSuccess(res, 200, `${targetUser.name} added to project as ${role}`, { member });
  } catch (error) {
    logger.error("Add project member error: %o", error);
    return sendError(res, 500, "Failed to add project member: " + error.message);
  }
};

/**
 * Remove a member or cancel a pending invite from a project
 */
const removeMember = async (req, res) => {
  const projectId = req.params.id;
  const targetUserId = req.params.userId;

  try {
    // 1. Verify owner is not being removed
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true }
    });

    if (project && project.ownerId === targetUserId) {
      return sendError(res, 400, "The project owner cannot be removed from the project.");
    }

    // 2. Check if target is a pending invite
    const pending = await prisma.pendingInvite.findUnique({
      where: { id: targetUserId }
    });

    if (pending && pending.projectId === projectId) {
      await prisma.pendingInvite.delete({
        where: { id: targetUserId }
      });

      emitToProject(req, projectId, SocketEvent.MEMBER_REMOVED, { inviteId: targetUserId, email: pending.email });
      return sendSuccess(res, 200, "Pending invitation cancelled successfully");
    }

    // 3. Look up user details for logging
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { name: true }
    });

    // Delete membership
    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId
        }
      }
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        actionType: ActivityType.MEMBER_REMOVED,
        entityType: "MEMBER",
        entityId: targetUserId,
        metadata: { name: user ? user.name : "Member" },
        projectId,
        userId: req.user.id
      }
    });

    // Broadcast change
    emitToProject(req, projectId, SocketEvent.MEMBER_REMOVED, { userId: targetUserId });

    return sendSuccess(res, 200, "Member removed from project successfully");
  } catch (error) {
    logger.error("Remove project member error: %o", error);
    return sendError(res, 500, "Failed to remove member. They may not be in the project.");
  }
};

/**
 * Calculate project progress based on task priority weights
 */
const getProgress = async (req, res) => {
  const projectId = req.params.id;

  try {
    const tasks = await prisma.task.findMany({
      where: { projectId },
      select: { status: true, priority: true }
    });

    if (tasks.length === 0) {
      return sendSuccess(res, 200, "Project progress is 0% (no tasks)", { progress: 0 });
    }

    let totalWeight = 0;
    let completedWeight = 0;

    tasks.forEach(task => {
      const weight = TaskPriorityWeight[task.priority] || 1;
      totalWeight += weight;
      if (task.status === "COMPLETED") {
        completedWeight += weight;
      }
    });

    const progress = totalWeight > 0
      ? Math.round((completedWeight / totalWeight) * 100)
      : 0;

    return sendSuccess(res, 200, "Project progress calculated", { progress });
  } catch (error) {
    logger.error("Project progress calculation error: %o", error);
    return sendError(res, 500, "Failed to calculate project progress");
  }
};

module.exports = {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
  getProgress
};
