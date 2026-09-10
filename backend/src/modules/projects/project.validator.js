const { z } = require("zod");
const { ProjectStatus, ProjectRole } = require("../../config/constants");

const inviteeSchema = z.union([
  z.string().email("Invitee must be a valid email"),
  z.object({
    email: z.string().email("Invitee must be a valid email"),
    role: z.nativeEnum(ProjectRole).or(z.string()).optional(),
  }),
]);

const createProjectSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters").max(100, "Project name cannot exceed 100 characters"),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional().nullable(),
  status: z.nativeEnum(ProjectStatus).optional(),
  repoName: z.string().trim().min(1, "Repository name cannot be empty").max(200).optional().nullable(),
  invitees: z.array(inviteeSchema).optional().nullable(),
});

const updateProjectSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters").max(100, "Project name cannot exceed 100 characters").optional(),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional().nullable(),
  status: z.nativeEnum(ProjectStatus).optional(),
});

const addMemberSchema = z.object({
  userId: z.string().uuid("Invalid user ID format").optional(),
  email: z.string().email("Invitee must be a valid email").optional(),
  role: z.nativeEnum(ProjectRole, {
    errorMap: () => ({ message: `Role must be one of: ${Object.values(ProjectRole).join(", ")}` }),
  }).optional().default("DEVELOPER"),
}).refine((data) => data.userId || data.email, {
  message: "Either userId or email must be provided",
});

module.exports = {
  createProjectSchema,
  updateProjectSchema,
  addMemberSchema,
};
