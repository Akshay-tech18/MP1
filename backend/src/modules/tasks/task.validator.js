const { z } = require("zod");
const { TaskPriority, TaskStatus } = require("../../config/constants");

const createTaskSchema = z.object({
  title: z.string().min(2, "Task title must be at least 2 characters").max(150),
  description: z.string().max(2000).optional().nullable(),
  priority: z.nativeEnum(TaskPriority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  assigneeId: z.string().uuid("Invalid assignee ID").optional().nullable(),
  sprintId: z.string().uuid("Invalid sprint ID").optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
});

const updateTaskSchema = z.object({
  title: z.string().min(2).max(150).optional(),
  description: z.string().max(2000).optional().nullable(),
  priority: z.nativeEnum(TaskPriority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  assigneeId: z.string().uuid().optional().nullable(),
  sprintId: z.string().uuid().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
});

const reorderTasksSchema = z.object({
  updates: z.array(
    z.object({
      id: z.string().uuid("Invalid task ID format"),
      orderIndex: z.number("Order index must be a number"),
      status: z.nativeEnum(TaskStatus).optional(), // in case they drop it in a different column
    })
  ).nonempty("Updates list cannot be empty"),
});

const createCommentSchema = z.object({
  content: z.string().min(1, "Comment content cannot be empty").max(1000),
});

module.exports = {
  createTaskSchema,
  updateTaskSchema,
  reorderTasksSchema,
  createCommentSchema,
};
