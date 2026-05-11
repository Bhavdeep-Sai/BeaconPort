require("dotenv").config();
const Student = require("../models/studentModel");
const ChatHistory = require("../models/chatHistoryModel");
const axios = require('axios');

module.exports = {
  getAITutorResponse: async (req, res) => {
    try {
      const { message, context, previous_messages, sessionId } = req.body;
      const studentId = req.user.id;
      const schoolId = req.user.schoolId;
      
      // Check if Gemini API key is configured
      if (!process.env.GEMINI_API_KEY) {
        console.error('Gemini API key not configured');
        return res.status(503).json({
          success: false,
          message: "AI service is not configured. Please contact your administrator."
        });
      }
      
      // Get student data for personalized responses
      const student = await Student.findById(studentId).select('name studentClass').populate('studentClass', 'name');
      
      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found"
        });
      }

      // Enhanced system prompt for better responses
      const systemPrompt = `You are an exceptional AI tutor helping a student named ${student.name} from ${student.studentClass?.classText || 'their class'}. 
      
      Your role and approach:
      - Be an excellent, supportive, and highly knowledgeable tutor
      - Provide clear, accurate, and helpful responses
      - For mathematical calculations and problems: ALWAYS provide the direct answer/solution FIRST, then follow with a detailed step-by-step explanation
      - For other subjects: Give comprehensive answers with clear explanations
      - Use encouraging and positive language
      - Adapt explanations to the student's level
      - Celebrate their learning efforts
      
      Response Structure for Math Problems:
      1. Start with: "Here's the answer: [direct answer]"
      2. Then provide: "Let me explain how we get this:"
      3. Follow with step-by-step breakdown
      4. End with encouragement or additional tips
      
      Guidelines:
      - Always be helpful and provide complete answers
      - For calculations: Show the final answer prominently first
      - Break down complex problems into clear steps
      - Use simple language and relatable examples
      - Encourage the student and acknowledge their efforts
      - Be thorough but concise
      - If unsure about something, suggest consulting their teacher`;

      // Build conversation history for Gemini
      let conversationHistory = systemPrompt + "\n\n";
      
      // Add previous messages if available
      if (previous_messages && previous_messages.length > 0) {
        const recentMessages = previous_messages.slice(-10); // Last 10 messages
        conversationHistory += "Previous conversation:\n";
        recentMessages.forEach(msg => {
          if (msg.role === 'user') {
            conversationHistory += `Student: ${msg.content}\n`;
          } else if (msg.role === 'assistant') {
            conversationHistory += `Tutor: ${msg.content}\n`;
          }
        });
      }
      
      conversationHistory += `\nStudent: ${message}\nTutor:`;

      let aiResponse;

      try {
        console.log('Calling Gemini API...');
        
        const geminiResponse = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            contents: [
              {
                parts: [
                  {
                    text: conversationHistory
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 800,
            },
            safetySettings: [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              }
            ]
          },
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 30000 // 30 second timeout
          }
        );
        
        if (geminiResponse.data.candidates && geminiResponse.data.candidates.length > 0) {
          aiResponse = geminiResponse.data.candidates[0].content.parts[0].text;
          console.log('Gemini API response received successfully');
        } else {
          throw new Error('No response generated from Gemini API');
        }
        
      } catch (geminiError) {
        console.error('Gemini API Error Details:', {
          status: geminiError.response?.status,
          statusText: geminiError.response?.statusText,
          data: geminiError.response?.data,
          message: geminiError.message,
          code: geminiError.code
        });
        
        // Handle specific Gemini errors and return appropriate error responses
        if (geminiError.response?.status === 400) {
          console.error('Gemini bad request:', geminiError.response.data);
          return res.status(400).json({
            success: false,
            message: "Invalid request format. Please try rephrasing your question.",
            error: 'bad_request'
          });
        } else if (geminiError.response?.status === 403) {
          console.error('Gemini API key invalid or quota exceeded');
          return res.status(503).json({
            success: false,
            message: "AI service access denied. Please contact your administrator.",
            error: 'access_denied'
          });
        } else if (geminiError.response?.status === 429) {
          console.error('Gemini rate limit exceeded');
          return res.status(503).json({
            success: false,
            message: "AI service is currently busy. Please try again in a moment.",
            error: 'rate_limit_exceeded'
          });
        } else if (geminiError.code === 'ECONNABORTED' || geminiError.code === 'ETIMEDOUT') {
          console.error('Gemini request timeout');
          return res.status(503).json({
            success: false,
            message: "AI service timeout. Please try again.",
            error: 'timeout'
          });
        } else if (geminiError.code === 'ENOTFOUND' || geminiError.code === 'ECONNREFUSED') {
          console.error('Gemini connection failed');
          return res.status(503).json({
            success: false,
            message: "Cannot connect to AI service. Please try again later.",
            error: 'connection_failed'
          });
        }
        
        // Return error for any other cases - no fallback responses
        return res.status(503).json({
          success: false,
          message: "AI service is currently unavailable. Please try again later.",
          error: 'service_unavailable'
        });
      }

      // Return response immediately without database save
      // Database save will be handled by frontend when session ends
      res.status(200).json({
        success: true,
        response: aiResponse,
        sessionId: sessionId || `session_${Date.now()}_${studentId}`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('AI Tutor Controller Error:', error);
      res.status(500).json({
        success: false,
        message: "Internal server error. Please try again later.",
        error: 'internal_server_error'
      });
    }
  },

  // Save complete chat session at once
  saveCompleteChatSession: async (req, res) => {
    try {
      const { sessionId, messages, context, title } = req.body;
      const studentId = req.user.id;
      const schoolId = req.user.schoolId;

      if (!messages || messages.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No messages to save"
        });
      }

      // Filter out system messages and only keep user/assistant messages
      const validMessages = messages.filter(msg => 
        msg.role && ['user', 'assistant'].includes(msg.role) && 
        msg.content && msg.content.trim().length > 0
      );

      if (validMessages.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid messages to save"
        });
      }

      // Generate title from first user message if not provided
      const generatedTitle = title || (() => {
        const firstUserMessage = validMessages.find(msg => msg.role === 'user');
        if (firstUserMessage) {
          const content = firstUserMessage.content.trim();
          return content.length > 50 ? content.substring(0, 50) + '...' : content;
        }
        return 'Chat Session';
      })();

      // Create or update chat session
      const chatSession = await ChatHistory.findOneAndUpdate(
        { sessionId, student: studentId },
        {
          student: studentId,
          school: schoolId,
          sessionId,
          messages: validMessages.map(msg => ({
            role: msg.role,
            content: msg.content.trim(),
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
          })),
          context: context || 'general',
          title: generatedTitle,
          startTime: validMessages.length > 0 ? new Date(validMessages[0].timestamp || Date.now()) : new Date(),
          lastActivity: new Date(),
          isActive: false // Mark as completed session
        },
        { 
          upsert: true, 
          new: true,
          setDefaultsOnInsert: true
        }
      );

      res.status(200).json({
        success: true,
        message: "Chat session saved successfully",
        sessionId: chatSession.sessionId,
        messageCount: validMessages.length
      });

    } catch (error) {
      console.error('Save Complete Chat Session Error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to save chat session"
      });
    }
  },

  getStudentChatHistory: async (req, res) => {
    try {
      const studentId = req.user.id;
      const { limit = 20, page = 1, search } = req.query;

      let query = { student: studentId, isActive: false }; // Only show completed sessions
      
      // Add search functionality
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { context: { $regex: search, $options: 'i' } }
        ];
      }

      const chatSessions = await ChatHistory.find(query)
        .sort({ lastActivity: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select('sessionId title context startTime lastActivity messageCount')
        .lean(); // Use lean() for better performance

      const totalCount = await ChatHistory.countDocuments(query);

      res.status(200).json({
        success: true,
        chatSessions,
        totalCount,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit)
      });
    } catch (error) {
      console.error('Get Chat History Error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve chat history"
      });
    }
  },

  getChatSession: async (req, res) => {
    try {
      const { sessionId } = req.params;
      const studentId = req.user.id;

      const chatSession = await ChatHistory.findOne({
        sessionId: sessionId,
        student: studentId
      }).lean();

      if (!chatSession) {
        return res.status(404).json({
          success: false,
          message: "Chat session not found"
        });
      }

      res.status(200).json({
        success: true,
        chatSession
      });
    } catch (error) {
      console.error('Get Chat Session Error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve chat session"
      });
    }
  },

  deleteChatSession: async (req, res) => {
    try {
      const { sessionId } = req.params;
      const studentId = req.user.id;

      const result = await ChatHistory.deleteOne({
        sessionId: sessionId,
        student: studentId
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Chat session not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "Chat session deleted successfully"
      });
    } catch (error) {
      console.error('Delete Chat Session Error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to delete chat session"
      });
    }
  },

  // Bulk delete old sessions (utility function)
  cleanupOldSessions: async (req, res) => {
    try {
      const studentId = req.user.id;
      const { daysOld = 30 } = req.query;
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysOld));

      const result = await ChatHistory.deleteMany({
        student: studentId,
        lastActivity: { $lt: cutoffDate }
      });

      res.status(200).json({
        success: true,
        message: `Deleted ${result.deletedCount} old chat sessions`,
        deletedCount: result.deletedCount
      });
    } catch (error) {
      console.error('Cleanup Old Sessions Error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to cleanup old sessions"
      });
    }
  }
};