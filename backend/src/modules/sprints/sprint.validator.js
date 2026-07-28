const { z } = require("zod");
const { SprintStatus } = require("../../config/constants");

const createSprintSchema = z.object({
  name: z.string().min(2, "Sprint name must be at least 2 characters").max(100),
  goal: z.string().max(500).optional().nullable(),
  startDate: z.string().datetime("Start date must be a valid ISO datetime"),
  endDate: z.string().datetime("End date must be a valid ISO datetime"),
}).refine((data) => {
  return new Date(data.endDate) > new Date(data.startDate);
}, {
  message: "End date must be after start date",
  path: ["endDate"],
});

const updateSprintSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  goal: z.string().max(500).optional().nullable(),
  status: z.nativeEnum(SprintStatus).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) > new Date(data.startDate);
  }
  return true;
}, {
  message: "End date must be after start date",
  path: ["endDate"],
});

const moveTasksSchema = z.object({
  taskIds: z.array(z.string().uuid("Invalid task ID format")).nonempty("Must provide at least one task ID"),
});

module.exports = {
  createSprintSchema,
  updateSprintSchema,
  moveTasksSchema,
};
