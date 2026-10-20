const prisma = require("../../config/db");
const { sendSuccess, sendError } = require("../../utils/response.utils");
const logger = require("../../utils/logger");

/**
 * Truncate date to Sunday midnight (Start of week)
 */
const getStartOfWeek = (d = new Date()) => {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sunday
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Retrieve timesheet logs for a project during a given week
 */
const getTimesheets = async (req, res) => {
  const projectId = req.params.projectId || req.params.id;
  const { weekDate: weekParam } = req.query;

  try {
    const weekDate = getStartOfWeek(weekParam ? new Date(weekParam) : new Date());

    let entries = [];
    if (prisma.timesheetEntry) {
      try {
        entries = await prisma.timesheetEntry.findMany({
          where: {
            projectId,
            weekDate
          },
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } }
          },
          orderBy: { dayIndex: "asc" }
        });
      } catch (dbErr) {
        logger.warn("Could not query timesheet_entries table (might need db push): %s", dbErr.message);
      }
    }

    return sendSuccess(res, 200, "Timesheets retrieved successfully", {
      weekDate: weekDate.toISOString(),
      entries
    });
  } catch (error) {
    logger.error("Get timesheets error: %o", error);
    return sendError(res, 500, "Failed to retrieve timesheets");
  }
};

/**
 * Log or update hours for a project member on a specific day
 */
const logHours = async (req, res) => {
  const projectId = req.params.projectId || req.params.id;
  const { memberId, dayIndex, hours, note, weekDate: weekParam } = req.body;

  const isManager =
    req.user.role === "ADMIN" ||
    req.projectMember?.role === "MANAGER" ||
    req.isProjectOwner === true;

  if (memberId && memberId !== req.user.id && !isManager) {
    return sendError(res, 403, "Only project managers or administrators can log hours on behalf of other team members");
  }

  const targetUserId = (isManager && memberId) ? memberId : req.user.id;
  const parsedDay = parseInt(dayIndex, 10);
  const parsedHours = parseFloat(hours);

  if (isNaN(parsedDay) || parsedDay < 0 || parsedDay > 6) {
    return sendError(res, 400, "dayIndex must be an integer between 0 and 6");
  }

  if (isNaN(parsedHours) || parsedHours < 0) {
    return sendError(res, 400, "hours must be a non-negative number");
  }

  try {
    const weekDate = getStartOfWeek(weekParam ? new Date(weekParam) : new Date());

    if (!prisma.timesheetEntry) {
      return sendError(res, 500, "Timesheet model not available in Prisma client");
    }

    const entry = await prisma.timesheetEntry.upsert({
      where: {
        userId_projectId_weekDate_dayIndex: {
          userId: targetUserId,
          projectId,
          weekDate,
          dayIndex: parsedDay
        }
      },
      update: {
        hours: parsedHours,
        note: note ? note.trim() : null
      },
      create: {
        userId: targetUserId,
        projectId,
        weekDate,
        dayIndex: parsedDay,
        hours: parsedHours,
        note: note ? note.trim() : null
      }
    });

    return sendSuccess(res, 200, "Hours logged successfully", { entry });
  } catch (error) {
    logger.error("Log hours error: %o", error);
    return sendError(res, 500, "Failed to save timesheet entry: " + error.message);
  }
};

module.exports = {
  getTimesheets,
  logHours,
  getStartOfWeek
};
