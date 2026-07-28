const prisma = require("../config/db");
const { sendError } = require("../utils/response.utils");
const { ProjectRole, SystemRole } = require("../config/constants");

/**
 * Middleware to enforce project-specific roles.
 * Expects project ID to be in req.params.projectId or req.params.id.
 * Allows access if the user is a system ADMIN, the project owner, or has one of the allowed project-level roles.
 * @param {...string} allowedProjectRoles - Project-level roles allowed (MANAGER, DEVELOPER, QA_TESTER, VIEWER)
 */
const checkProjectRole = (...allowedProjectRoles) => {
  return async (req, res, next) => {
    const projectId = req.params.projectId || req.params.id;

    if (!projectId) {
      return sendError(res, 400, "Project ID parameter is missing from route path");
    }

    if (!req.user) {
      return sendError(res, 401, "Not authenticated");
    }

    // System-level ADMIN bypasses all project-level restrictions
    if (req.user.role === SystemRole.ADMIN) {
      return next();
    }

    try {
      // 1. Fetch project to check ownership
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { ownerId: true }
      });

      if (!project) {
        return sendError(res, 404, "Project not found");
      }

      // Project owner acts with MANAGER authority automatically
      if (project.ownerId === req.user.id) {
        return next();
      }

      // 2. Query user membership role in this project
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: req.user.id
          }
        }
      });

      if (!member) {
        return sendError(res, 403, "Access denied. You are not a member of this project");
      }

      // Store member details on request in case controllers need it
      req.projectMember = member;

      // 3. Verify roles
      if (allowedProjectRoles.includes(member.role)) {
        return next();
      }

      // Special case: Project manager can perform anything
      if (member.role === ProjectRole.MANAGER) {
        return next();
      }

      return sendError(
        res,
        403,
        `Access denied. Requires project role: ${allowedProjectRoles.join(" or ")}`
      );
    } catch (error) {
      return sendError(res, 500, "Error validating project membership: " + error.message);
    }
  };
};

module.exports = {
  checkProjectRole
};
