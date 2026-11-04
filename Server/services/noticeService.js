const Notice = require("../models/noticeModel");
const School = require("../models/schoolModel");
const Teacher = require("../models/teacherModel");
const { escapeRegex } = require("../utils/escapeRegex");
const {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} = require("../utils/errors");

class NoticeService {
  async createNotice({
    schoolId,
    userId,
    userRole,
    title,
    message,
    audience,
    isImportant,
    expiryDate,
  }) {
    if (!userId) {
      throw new BadRequestError("User ID not found in request");
    }
    if (!schoolId) {
      throw new BadRequestError("School ID not found in request");
    }

    // Teachers can only create notices for Students
    if (userRole === "TEACHER" && audience !== "Student") {
      throw new ForbiddenError("Teachers can only create notices for students");
    }

    // Determine creator name
    let creatorName = "Unknown User";
    if (userRole === "SCHOOL") {
      const school = await School.findById(userId);
      creatorName = school ? school.ownerName : "Unknown School";
    } else if (userRole === "TEACHER") {
      const teacher = await Teacher.findById(userId);
      creatorName = teacher ? teacher.name : "Unknown Teacher";
    }

    const noticeData = {
      school: schoolId,
      title,
      message,
      audience,
      isImportant: isImportant || false,
      creatorRole: userRole,
      createdBy: creatorName,
      createdId: userId,
    };

    if (expiryDate) {
      noticeData.expiryDate = expiryDate;
    }

    const newNotice = new Notice(noticeData);
    await newNotice.save();

    return Notice.findById(newNotice._id).populate("school", "name location");
  }

  async getAllNotices({ schoolId, userId, userRole, query }) {
    let filter = { school: schoolId };
    const sort = {};

    // Role-based filtering
    if (userRole === "TEACHER") {
      const teacher = await Teacher.findById(userId);
      const teacherName = teacher ? teacher.name : "Unknown Teacher";

      filter.$or = [
        { createdBy: teacherName, audience: "Student" },
        { audience: "Teacher" },
        { audience: "All" },
      ];
    } else if (userRole === "STUDENT") {
      filter.$or = [{ audience: "Student" }, { audience: "All" }];
    }

    // Apply audience filter
    if (query.audience && query.audience !== "All") {
      if (userRole === "TEACHER") {
        const teacher = await Teacher.findById(userId);
        const teacherName = teacher ? teacher.name : "Unknown Teacher";

        if (query.audience === "Student") {
          filter = {
            school: schoolId,
            createdBy: teacherName,
            audience: "Student",
          };
        } else if (query.audience === "Teacher") {
          filter = {
            school: schoolId,
            audience: "Teacher",
          };
        }
      } else if (userRole === "STUDENT") {
        if (query.audience === "Student" || query.audience === "All") {
          filter.audience = query.audience;
        }
      } else {
        filter.audience = query.audience;
      }
    }

    // ReDoS-protected search filter
    if (query.search) {
      const safeSearch = escapeRegex(query.search, 50);
      if (safeSearch) {
        const searchFilter = {
          $or: [
            { title: { $regex: safeSearch, $options: "i" } },
            { message: { $regex: safeSearch, $options: "i" } },
          ],
        };

        if (filter.$or) {
          filter = {
            $and: [{ school: schoolId }, { $or: filter.$or }, searchFilter],
          };
        } else {
          Object.assign(filter, searchFilter);
        }
      }
    }

    if (query.important === "true") {
      filter.isImportant = true;
    }

    if (query.startDate && query.endDate) {
      filter.createdAt = {
        $gte: new Date(query.startDate),
        $lte: new Date(query.endDate),
      };
    } else if (query.startDate) {
      filter.createdAt = { $gte: new Date(query.startDate) };
    } else if (query.endDate) {
      filter.createdAt = { $lte: new Date(query.endDate) };
    }

    if (query.sortBy) {
      sort[query.sortBy] = query.sortOrder === "asc" ? 1 : -1;
    } else {
      sort.createdAt = -1;
    }

    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const [notices, totalNotices] = await Promise.all([
      Notice.find(filter)
        .populate("school", "name location")
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Notice.countDocuments(filter),
    ]);

    return {
      notices,
      pagination: {
        total: totalNotices,
        page,
        limit,
        pages: Math.ceil(totalNotices / limit),
      },
    };
  }

  async getNoticeById({ schoolId, userId, userRole, noticeId }) {
    if (!noticeId) {
      throw new BadRequestError("Notice ID is required");
    }

    const filter = { _id: noticeId, school: schoolId };

    if (userRole === "TEACHER") {
      const teacher = await Teacher.findById(userId);
      const teacherName = teacher ? teacher.name : "Unknown Teacher";
      filter.$or = [
        { createdBy: teacherName, audience: "Student" },
        { audience: "Teacher" },
      ];
    } else if (userRole === "STUDENT") {
      filter.$or = [{ audience: "Student" }, { audience: "All" }];
    }

    const notice = await Notice.findOne(filter).populate(
      "school",
      "name location"
    );

    if (!notice) {
      throw new NotFoundError(
        "Notice not found or you don't have permission to view it"
      );
    }

    return notice;
  }

  async getNoticesByAudience({ schoolId, userId, userRole, audience }) {
    if (!audience) {
      throw new BadRequestError("Audience parameter is required");
    }

    const filter = { school: schoolId, audience };

    if (userRole === "TEACHER") {
      if (audience === "Student") {
        const teacher = await Teacher.findById(userId);
        filter.createdBy = teacher ? teacher.name : "Unknown Teacher";
      } else if (audience !== "Teacher") {
        throw new ForbiddenError(
          "You don't have permission to view these notices"
        );
      }
    } else if (userRole === "STUDENT") {
      if (audience !== "Student" && audience !== "All") {
        throw new ForbiddenError(
          "You don't have permission to view these notices"
        );
      }
    }

    return Notice.find(filter)
      .populate("school", "name location")
      .sort({ createdAt: -1 });
  }

  async updateNotice({ schoolId, userId, userRole, noticeId, data }) {
    if (!noticeId) {
      throw new BadRequestError("Notice ID is required");
    }

    const existingNotice = await Notice.findOne({
      _id: noticeId,
      school: schoolId,
    });

    if (!existingNotice) {
      throw new NotFoundError("Notice not found");
    }

    if (userRole === "TEACHER") {
      const teacher = await Teacher.findById(userId);
      const teacherName = teacher ? teacher.name : "Unknown Teacher";

      if (existingNotice.createdBy !== teacherName) {
        throw new ForbiddenError(
          "Teachers can only modify notices they created"
        );
      }

      if (existingNotice.audience !== "Student") {
        throw new ForbiddenError("Teachers can only modify student notices");
      }

      if (data.audience && data.audience !== "Student") {
        throw new ForbiddenError(
          "Teachers can only create/modify notices for students"
        );
      }
    }

    const updateData = {
      title: data.title || existingNotice.title,
      message: data.message || existingNotice.message,
      audience: data.audience || existingNotice.audience,
      isImportant:
        data.isImportant !== undefined
          ? data.isImportant
          : existingNotice.isImportant,
      updatedAt: new Date(),
    };

    if (data.expiryDate !== undefined) {
      updateData.expiryDate = data.expiryDate;
    }

    const updatedNotice = await Notice.findOneAndUpdate(
      { _id: noticeId, school: schoolId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate("school", "name location");

    if (!updatedNotice) {
      throw new NotFoundError("Notice not found or update failed");
    }

    return updatedNotice;
  }

  async deleteNotice({ schoolId, userId, userRole, noticeId }) {
    if (!noticeId) {
      throw new BadRequestError("Notice ID is required");
    }

    const existingNotice = await Notice.findOne({
      _id: noticeId,
      school: schoolId,
    });

    if (!existingNotice) {
      throw new NotFoundError("Notice not found");
    }

    if (userRole === "TEACHER") {
      const teacher = await Teacher.findById(userId);
      const teacherName = teacher ? teacher.name : "Unknown Teacher";

      if (existingNotice.createdBy !== teacherName) {
        throw new ForbiddenError(
          "Teachers can only delete notices they created"
        );
      }

      if (existingNotice.audience !== "Student") {
        throw new ForbiddenError("Teachers can only delete student notices");
      }
    }

    await Notice.findOneAndDelete({
      _id: noticeId,
      school: schoolId,
    });

    return true;
  }

  async batchDeleteNotices({ schoolId, userId, userRole, ids }) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestError("Please provide an array of notice IDs");
    }

    const deleteFilter = {
      _id: { $in: ids },
      school: schoolId,
    };

    if (userRole === "TEACHER") {
      const teacher = await Teacher.findById(userId);
      deleteFilter.createdBy = teacher ? teacher.name : "Unknown Teacher";
      deleteFilter.audience = "Student";
    }

    const result = await Notice.deleteMany(deleteFilter);
    return result.deletedCount || 0;
  }

  async getImportantNotices({ schoolId, userId, userRole }) {
    const filter = {
      school: schoolId,
      isImportant: true,
    };

    if (userRole === "TEACHER") {
      const teacher = await Teacher.findById(userId);
      const teacherName = teacher ? teacher.name : "Unknown Teacher";
      filter.$or = [
        { createdBy: teacherName, audience: "Student" },
        { audience: "Teacher" },
      ];
    } else if (userRole === "STUDENT") {
      filter.$or = [{ audience: "Student" }, { audience: "All" }];
    }

    return Notice.find(filter)
      .populate("school", "name location")
      .sort({ createdAt: -1 });
  }

  async getActiveNotices({ schoolId, userId, userRole }) {
    const currentDate = new Date();
    const filter = {
      school: schoolId,
      expiryDate: { $gte: currentDate },
    };

    if (userRole === "TEACHER") {
      const teacher = await Teacher.findById(userId);
      const teacherName = teacher ? teacher.name : "Unknown Teacher";
      filter.$or = [
        { createdBy: teacherName, audience: "Student" },
        { audience: "Teacher" },
      ];
    } else if (userRole === "STUDENT") {
      filter.$or = [{ audience: "Student" }, { audience: "All" }];
    }

    return Notice.find(filter)
      .populate("school", "name location")
      .sort({ createdAt: -1 });
  }
}

module.exports = new NoticeService();
