const { z } = require("zod");
const { SprintStatus } = require("../../config/constants");

const dateStringSchema = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: "Must be a valid date",
});

const createSprintSchema = z.object({
  name: z.string().min(2, "Sprint name must be at least 2 characters").max(100),
  goal: z.string().max(500).optional().nullable(),
  startDate: dateStringSchema,
  endDate: dateStringSchema,
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
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
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
