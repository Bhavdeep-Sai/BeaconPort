const express = require('express');
const { 
  getAITutorResponse, 
  saveCompleteChatSession, 
  getStudentChatHistory,
  getChatSession,
  deleteChatSession,
  cleanupOldSessions
} = require('../controllers/aiTutorController');
const authMiddleware = require('../auth/auth');
const router = express.Router();

// Main AI tutor endpoint - protected route for students
// This only handles the AI response, no database operations
router.post('/chat', authMiddleware(['STUDENT']), getAITutorResponse);

// Save complete chat session at once (called when session ends)
router.post('/save-session', authMiddleware(['STUDENT']), saveCompleteChatSession);

// Get student's chat history (completed sessions only)
router.get('/chat-history', authMiddleware(['STUDENT']), getStudentChatHistory);

// Get specific chat session with all messages
router.get('/session/:sessionId', authMiddleware(['STUDENT']), getChatSession);

// Delete specific chat session
router.delete('/session/:sessionId', authMiddleware(['STUDENT']), deleteChatSession);

// Cleanup old sessions (utility endpoint)
router.delete('/cleanup', authMiddleware(['STUDENT']), cleanupOldSessions);

module.exports = router;