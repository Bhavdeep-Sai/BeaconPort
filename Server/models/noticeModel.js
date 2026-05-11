const mongoose = require("mongoose");

const noticeSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Notice title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    message: {
      type: String,
      required: [true, "Notice message is required"],
      trim: true,
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },
    audience: {
      type: String,
      required: [true, "Audience is required"],
      enum: {
        values: ["Student", "Teacher", "All"],
        message: "Audience must be either Student, Teacher, or All",
      },
    },
    isImportant: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: String, 
      required: [true, "Creator name is required"],
      trim: true,
    },
    creatorRole: {
      type: String, 
      required: [true, "Creator Role is required"],
      trim: true,
    },
    createdId: {
      type: String, 
    },
    expiryDate: {
      type: Date,
      validate: {
        validator: function (value) {
          
          if (value) {
            return value > new Date();
          }
          return true;
        },
        message: "Expiry date must be in the future",
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, 
  }
);


noticeSchema.index({ school: 1, audience: 1 });
noticeSchema.index({ school: 1, createdBy: 1 });
noticeSchema.index({ school: 1, isImportant: 1 });
noticeSchema.index({ school: 1, expiryDate: 1 });

module.exports = mongoose.model("Notice", noticeSchema);