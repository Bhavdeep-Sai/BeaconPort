const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false }); // Disable _id for subdocuments

const chatHistorySchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  messages: {
    type: [messageSchema],
    default: [],
    validate: {
      validator: function(messages) {
        return messages.length <= 200; // Limit messages per session
      },
      message: 'Too many messages in a single session'
    }
  },
  context: {
    type: String,
    enum: ['math', 'science', 'study_tips', 'assignment', 'general', 'exam_prep'],
    default: 'general',
    index: true
  },
  title: {
    type: String,
    trim: true,
    maxlength: 100,
    default: 'Chat Session'
  },
  startTime: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastActivity: {
    type: Date,
    default: Date.now,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: false, // Disable automatic timestamps since we have custom ones
  minimize: false
});

// Compound indexes for better query performance
chatHistorySchema.index({ student: 1, lastActivity: -1 });
chatHistorySchema.index({ student: 1, isActive: 1, lastActivity: -1 });
chatHistorySchema.index({ student: 1, context: 1 });
chatHistorySchema.index({ sessionId: 1, student: 1 }, { unique: true });

// Virtual for message count
chatHistorySchema.virtual('messageCount').get(function() {
  return this.messages ? this.messages.length : 0;
});

// Virtual for session duration in minutes
chatHistorySchema.virtual('durationMinutes').get(function() {
  if (this.messages && this.messages.length > 1) {
    const firstMessage = this.messages[0];
    const lastMessage = this.messages[this.messages.length - 1];
    const diff = new Date(lastMessage.timestamp) - new Date(firstMessage.timestamp);
    return Math.round(diff / (1000 * 60)); // Convert to minutes
  }
  return 0;
});

// Virtual for last message preview
chatHistorySchema.virtual('lastMessagePreview').get(function() {
  if (this.messages && this.messages.length > 0) {
    const lastUserMessage = [...this.messages].reverse().find(msg => msg.role === 'user');
    if (lastUserMessage) {
      return lastUserMessage.content.length > 60 
        ? lastUserMessage.content.substring(0, 60) + '...'
        : lastUserMessage.content;
    }
  }
  return '';
});

// Pre-save middleware for optimization
chatHistorySchema.pre('save', function(next) {
  // Update lastActivity if messages exist
  if (this.messages && this.messages.length > 0) {
    const lastMessage = this.messages[this.messages.length - 1];
    this.lastActivity = lastMessage.timestamp || new Date();
  }
  
  // Auto-generate title if not set or default
  if (!this.title || this.title === 'Chat Session') {
    const firstUserMessage = this.messages ? this.messages.find(msg => msg.role === 'user') : null;
    if (firstUserMessage) {
      const content = firstUserMessage.content.trim();
      this.title = content.length > 50 ? content.substring(0, 50) + '...' : content;
    }
  }
  
  next();
});

// Static method to find recent sessions with minimal data
chatHistorySchema.statics.findRecentSessions = function(studentId, limit = 10) {
  return this.find({ 
    student: studentId, 
    isActive: false // Only completed sessions
  })
  .select('sessionId title context startTime lastActivity messageCount')
  .sort({ lastActivity: -1 })
  .limit(limit)
  .lean();
};

// Static method for efficient search
chatHistorySchema.statics.searchSessions = function(studentId, searchTerm, options = {}) {
  const searchQuery = {
    student: studentId,
    isActive: false,
    $or: [
      { title: { $regex: searchTerm, $options: 'i' } },
      { context: { $regex: searchTerm, $options: 'i' } }
    ]
  };
  
  return this.find(searchQuery)
    .select('sessionId title context startTime lastActivity messageCount')
    .sort({ lastActivity: -1 })
    .limit(options.limit || 20)
    .lean();
};

// Static method to cleanup old sessions
chatHistorySchema.statics.cleanupOldSessions = function(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return this.deleteMany({
    lastActivity: { $lt: cutoffDate },
    isActive: false
  });
};

// Instance method to get session summary
chatHistorySchema.methods.getSummary = function() {
  return {
    sessionId: this.sessionId,
    title: this.title,
    context: this.context,
    messageCount: this.messageCount,
    duration: this.durationMinutes,
    startTime: this.startTime,
    lastActivity: this.lastActivity,
    preview: this.lastMessagePreview
  };
};

// Ensure virtual fields are serialized
chatHistorySchema.set('toJSON', { virtuals: true });
chatHistorySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ChatHistory', chatHistorySchema);