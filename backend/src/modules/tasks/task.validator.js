const { z } = require("zod");
const { TaskPriority, TaskStatus } = require("../../config/constants");

const nullableUuid = z.preprocess(
  (val) => (val === "" || val === undefined ? null : val),
  z.string().uuid("Invalid UUID format").nullable().optional()
);

const nullableDateTime = z.preprocess(
  (val) => (val === "" || val === undefined ? null : val),
  z.string().datetime().nullable().optional()
);

const nullableString = z.preprocess(
  (val) => (val === "" || val === undefined ? null : val),
  z.string().max(2000).nullable().optional()
);

const createTaskSchema = z.object({
  title: z.string().min(1, "Task title cannot be empty").max(150),
  description: nullableString,
  priority: z.nativeEnum(TaskPriority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  assigneeId: nullableUuid,
  sprintId: nullableUuid,
  dueDate: nullableDateTime,
  estimatedTime: z.number().int().min(0).optional(),
  timeSpent: z.number().int().min(0).optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(150).optional(),
  description: nullableString,
  priority: z.nativeEnum(TaskPriority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  assigneeId: nullableUuid,
  sprintId: nullableUuid,
  dueDate: nullableDateTime,
  estimatedTime: z.number().int().min(0).optional(),
  timeSpent: z.number().int().min(0).optional(),
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
