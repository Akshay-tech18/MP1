const { z } = require("zod");

const sendMessageSchema = z.object({
  content: z.string().min(1, "Message content cannot be empty").max(5000, "Message content cannot exceed 5000 characters"),
  isGroup: z.boolean().optional(),
  receiverId: z.string().uuid("Invalid receiver ID format").optional().nullable(),
  fileUrl: z.string().url("Invalid file URL").optional().nullable(),
});

module.exports = {
  sendMessageSchema,
};
