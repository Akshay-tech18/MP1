const { z } = require("zod");

const sendMessageSchema = z
  .object({
    content: z.string().max(5000, "Message content cannot exceed 5000 characters").optional().default(""),
    isGroup: z.boolean().optional(),
    channelId: z.string().min(1).max(100).optional().nullable(),
    receiverId: z.string().uuid("Invalid receiver ID format").optional().nullable(),
    fileUrl: z.string().max(10000000, "Attachment payload too large").optional().nullable(),
  })
  .refine(
    (data) => (data.content && data.content.trim().length > 0) || (data.fileUrl && data.fileUrl.trim().length > 0),
    {
      message: "Message must contain either text content or an attachment",
      path: ["content"],
    }
  );

module.exports = {
  sendMessageSchema,
};
