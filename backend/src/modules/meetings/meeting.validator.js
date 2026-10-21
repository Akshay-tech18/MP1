const { z } = require("zod");
const { MeetingType, MeetingRecurrence } = require("../../config/constants");

const dateStringSchema = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: "Must be a valid date or timestamp",
});

const createMeetingSchema = z
  .object({
    title: z.string().min(2, "Meeting title must be at least 2 characters").max(150),
    description: z.string().max(1000).optional().nullable(),
    type: z.nativeEnum(MeetingType).default(MeetingType.STANDUP),
    startTime: dateStringSchema,
    endTime: dateStringSchema,
    recurrence: z.nativeEnum(MeetingRecurrence).default(MeetingRecurrence.NONE),
    channelId: z.string().optional().nullable(),
    sprintId: z.string().uuid("Invalid sprint ID").optional().nullable(),
  })
  .refine(
    (data) => {
      return new Date(data.endTime) > new Date(data.startTime);
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    }
  );

const updateMeetingSchema = z
  .object({
    title: z.string().min(2).max(150).optional(),
    description: z.string().max(1000).optional().nullable(),
    type: z.nativeEnum(MeetingType).optional(),
    startTime: dateStringSchema.optional(),
    endTime: dateStringSchema.optional(),
    recurrence: z.nativeEnum(MeetingRecurrence).optional(),
    channelId: z.string().optional().nullable(),
    sprintId: z.string().uuid("Invalid sprint ID").optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return new Date(data.endTime) > new Date(data.startTime);
      }
      return true;
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    }
  );

module.exports = {
  createMeetingSchema,
  updateMeetingSchema,
};
