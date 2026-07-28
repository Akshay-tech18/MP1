const { z } = require("zod");
const { SystemRole } = require("../../config/constants");

const updateMeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name cannot exceed 50 characters").optional(),
  avatar: z.string().url("Avatar must be a valid URL").optional(),
});

const changeRoleSchema = z.object({
  role: z.nativeEnum(SystemRole, {
    errorMap: () => ({ message: `Role must be one of: ${Object.values(SystemRole).join(", ")}` }),
  }),
});

module.exports = {
  updateMeSchema,
  changeRoleSchema,
};
