import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import {
    BookOpen,
    Send,
    X,
    Minus,
    GraduationCap,
    AlertCircle,
    History,
    Trash2,
    Maximize2,
    Save,
    RefreshCw,
    Clock,
    Timer,
} from "lucide-react";
import { baseApi } from "../../../environment";

// Rate Limiter Class for Gemini API
class GeminiRateLimiter {
    constructor() {
        this.requests = [];
        this.maxRequestsPerMinute = 15;
        this.maxRequestsPerDay = 1500;
        this.timeWindow = 60000; // 1 minute in ms
        this.dailyResetTime = this.getTodayMidnight();
        this.requestQueue = [];
        this.processing = false;
        
        // Load persisted data
        this.loadPersistedData();
    }

    getTodayMidnight() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    }

    loadPersistedData() {
        try {
            const data = localStorage.getItem('gemini_rate_limit_data');
            if (data) {
                const parsed = JSON.parse(data);
                const today = this.getTodayMidnight();
                
                // Reset if it's a new day
                if (parsed.dailyResetTime !== today) {
                    this.resetDailyCount();
                } else {
                    this.requests = parsed.requests || [];
                    this.dailyCount = parsed.dailyCount || 0;
                }
            }
        } catch (error) {
            console.error('Error loading rate limit data:', error);
            this.resetDailyCount();
        }
    }

    persistData() {
        try {
            const data = {
                requests: this.requests,
                dailyCount: this.dailyCount || 0,
                dailyResetTime: this.dailyResetTime
            };
            localStorage.setItem('gemini_rate_limit_data', JSON.stringify(data));
        } catch (error) {
            console.error('Error persisting rate limit data:', error);
        }
    }

    resetDailyCount() {
        this.dailyCount = 0;
        this.dailyResetTime = this.getTodayMidnight();
        this.persistData();
    }

    cleanOldRequests() {
        const now = Date.now();
        const today = this.getTodayMidnight();
        
        // Reset daily count if it's a new day
        if (this.dailyResetTime !== today) {
            this.resetDailyCount();
        }
        
        // Remove requests older than 1 minute
        this.requests = this.requests.filter(time => now - time < this.timeWindow);
        this.persistData();
    }

    canMakeRequest() {
        this.cleanOldRequests();
        
        const minuteCheck = this.requests.length < this.maxRequestsPerMinute;
        const dailyCheck = (this.dailyCount || 0) < this.maxRequestsPerDay;
        
        return minuteCheck && dailyCheck;
    }

    getWaitTime() {
        this.cleanOldRequests();
        
        if ((this.dailyCount || 0) >= this.maxRequestsPerDay) {
            const tomorrow = this.getTodayMidnight() + 24 * 60 * 60 * 1000;
            return tomorrow - Date.now();
        }
        
        if (this.requests.length >= this.maxRequestsPerMinute) {
            const oldestRequest = this.requests[0];
            return this.timeWindow - (Date.now() - oldestRequest);
        }
        
        return 0;
    }

    getRemainingRequests() {
        this.cleanOldRequests();
        return {
            perMinute: Math.max(0, this.maxRequestsPerMinute - this.requests.length),
            perDay: Math.max(0, this.maxRequestsPerDay - (this.dailyCount || 0))
        };
    }

    async makeRequest(apiCall) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ apiCall, resolve, reject });
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.processing || this.requestQueue.length === 0) return;
        
        this.processing = true;
        
        while (this.requestQueue.length > 0) {
            const { apiCall, resolve, reject } = this.requestQueue.shift();
            
            try {
                const waitTime = this.getWaitTime();
                
                if (waitTime > 0) {
                    console.log(`Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
                    await new Promise(res => setTimeout(res, waitTime));
                }
                
                // Record the request
                const now = Date.now();
                this.requests.push(now);
                this.dailyCount = (this.dailyCount || 0) + 1;
                this.persistData();
                
                const result = await apiCall();
                resolve(result);
                
            } catch (error) {
                reject(error);
            }
        }
        
        this.processing = false;
    }

    getStatus() {
        const remaining = this.getRemainingRequests();
        const waitTime = this.getWaitTime();
        
        return {
            canMakeRequest: this.canMakeRequest(),
            remaining,
            waitTime,
            queueLength: this.requestQueue.length
        };
    }
}

// Student AI Tutor Icon component
const TutorIcon = ({ size = 24 }) => (
    <div className={`w-8 h-8 bg-gradient-to-r from-amber-600 to-orange-600 rounded-full flex items-center justify-center`}>
        <GraduationCap size={size * 0.6} className="text-black" />
    </div>
);

// Enhanced Message Component with improved readability
const MessageContent = ({ message, isBot }) => {
    if (!isBot) {
        return (
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.text}
            </div>
        );
    }

    // Bot messages with clean, readable formatting
    return (
        <div className="text-sm leading-relaxed">
            <ReactMarkdown
                components={{
                    // Links
                    a: ({ ...props }) => (
                        <a
                            {...props}
                            className="text-amber-300 hover:text-amber-200 underline decoration-amber-300/50 hover:decoration-amber-200 transition-all duration-200"
                            target="_blank"
                            rel="noopener noreferrer"
                        />
                    ),
                    // Paragraphs with proper spacing
                    p: ({ ...props }) => (
                        <p {...props} className="mb-3 last:mb-0 leading-relaxed" />
                    ),
                    // Headings with better hierarchy
                    h1: ({ ...props }) => (
                        <h1 {...props} className="text-lg font-bold text-amber-300 mb-3 mt-2 first:mt-0" />
                    ),
                    h2: ({ ...props }) => (
                        <h2 {...props} className="text-base font-semibold text-amber-300 mb-2 mt-3 first:mt-0" />
                    ),
                    h3: ({ ...props }) => (
                        <h3 {...props} className="text-sm font-medium text-amber-300 mb-2 mt-2 first:mt-0" />
                    ),
                    // Lists with better spacing
                    ul: ({ ...props }) => (
                        <ul {...props} className="list-disc list-inside mb-3 space-y-1 pl-2" />
                    ),
                    ol: ({ ...props }) => (
                        <ol {...props} className="list-decimal list-inside mb-3 space-y-1 pl-2" />
                    ),
                    li: ({ ...props }) => (
                        <li {...props} className="text-sm leading-relaxed" />
                    ),
                    // Code blocks with better contrast
                    code: ({ inline, ...props }) =>
                        inline ? (
                            <code
                                {...props}
                                className="bg-gray-700/80 text-amber-200 px-1.5 py-0.5 rounded text-xs font-mono border border-gray-600/50"
                            />
                        ) : (
                            <pre className="bg-gray-700/80 border border-gray-600/50 rounded-lg p-3 mb-3 overflow-x-auto">
                                <code
                                    {...props}
                                    className="text-amber-200 text-xs font-mono block"
                                />
                            </pre>
                        ),
                    // Blockquotes
                    blockquote: ({ ...props }) => (
                        <blockquote
                            {...props}
                            className="border-l-4 border-amber-500/60 pl-4 py-2 italic text-gray-300 mb-3 bg-gray-800/30 rounded-r"
                        />
                    ),
                    // Tables with better styling
                    table: ({ ...props }) => (
                        <div className="overflow-x-auto mb-3">
                            <table {...props} className="border-collapse border border-gray-600/50 w-full text-xs rounded" />
                        </div>
                    ),
                    th: ({ ...props }) => (
                        <th {...props} className="border border-gray-600/50 px-3 py-2 bg-gray-700/60 font-semibold text-amber-300 text-left" />
                    ),
                    td: ({ ...props }) => (
                        <td {...props} className="border border-gray-600/50 px-3 py-2" />
                    ),
                    // Bold and italic text
                    strong: ({ ...props }) => (
                        <strong {...props} className="font-semibold text-amber-200" />
                    ),
                    em: ({ ...props }) => (
                        <em {...props} className="italic text-gray-300" />
                    ),
                    // Horizontal rule
                    hr: ({ ...props }) => (
                        <hr {...props} className="border-gray-600/50 my-4" />
                    ),
                }}
            >
                {message.text}
            </ReactMarkdown>
        </div>
    );
};

// Rate Limit Status Component
const RateLimitStatus = ({ rateLimitStatus, onRetry }) => {
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        if (rateLimitStatus.waitTime > 0) {
            setTimeLeft(Math.ceil(rateLimitStatus.waitTime / 1000));
            const interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        if (onRetry) onRetry();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [rateLimitStatus.waitTime, onRetry]);

    if (rateLimitStatus.waitTime > 0) {
        const hours = Math.floor(timeLeft / 3600);
        const minutes = Math.floor((timeLeft % 3600) / 60);
        const seconds = timeLeft % 60;
        
        const isDaily = rateLimitStatus.waitTime > 3600000; // More than 1 hour suggests daily limit
        
        return (
            <div className="bg-orange-900/50 border border-orange-600 p-3 rounded-lg mb-2">
                <div className="flex items-center space-x-2">
                    <Clock size={16} className="text-orange-400" />
                    <span className="text-orange-300 text-sm font-medium">
                        {isDaily ? 'Daily Limit Reached' : 'Rate Limited'}
                    </span>
                </div>
                <p className="text-orange-200 text-xs mt-1">
                    {isDaily 
                        ? `Daily quota of 1,500 requests reached. Resets in ${hours}h ${minutes}m ${seconds}s`
                        : `Too many requests. Next request available in ${minutes}m ${seconds}s`
                    }
                </p>
                {rateLimitStatus.queueLength > 0 && (
                    <p className="text-orange-200 text-xs mt-1">
                        {rateLimitStatus.queueLength} request(s) queued
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="bg-gray-800 border border-gray-600 p-2 rounded text-xs">
            <div className="flex justify-between text-gray-400">
                <span>Requests remaining:</span>
                <span>{rateLimitStatus.remaining.perMinute}/15 per min, {rateLimitStatus.remaining.perDay}/1500 per day</span>
            </div>
        </div>
    );
};

const ChatBot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [studentName, setStudentName] = useState("Student");
    const [connectionStatus, setConnectionStatus] = useState("checking");
    const [lastError, setLastError] = useState(null);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [chatHistory, setChatHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [chatSize, setChatSize] = useState({ width: 450, height: 650 });
    const [isResizing, setIsResizing] = useState(false);
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    
    // Rate limiting states
    const [rateLimiter] = useState(() => new GeminiRateLimiter());
    const [rateLimitStatus, setRateLimitStatus] = useState({
        canMakeRequest: true,
        remaining: { perMinute: 15, perDay: 1500 },
        waitTime: 0,
        queueLength: 0
    });

    // Update rate limit status periodically
    useEffect(() => {
        const updateStatus = () => {
            setRateLimitStatus(rateLimiter.getStatus());
        };
        
        updateStatus();
        const interval = setInterval(updateStatus, 1000);
        return () => clearInterval(interval);
    }, [rateLimiter]);

    // Detect mobile screen size
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Get student info from token
    useEffect(() => {
        try {
            const token = localStorage.getItem("token") || sessionStorage.getItem("token");
            if (token) {
                const payload = JSON.parse(atob(token.split(".")[1]));
                setStudentName(payload.name || "Student");
            }
        } catch (error) {
            console.error("Error getting student info:", error);
        }
    }, []);

    const [messages, setMessages] = useState([
        {
            id: 1,
            text: "# Welcome to Your AI Study Buddy! 🎓\n\Hey there! I'm your AI Study Buddy, powered by BeaconPort. Whether you're tackling tough concepts or just looking for a little extra support, I'm here to make learning smoother, smarter, and more fun. Let's dive in and explore together!",
            isBot: true,
            timestamp: new Date(),
        },
    ]);

    const messagesEndRef = useRef(null);
    const chatRef = useRef(null);
    const saveTimeoutRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Auto-save functionality with debouncing
    useEffect(() => {
        if (hasUnsavedChanges && messages.length > 1) {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            saveTimeoutRef.current = setTimeout(() => {
                saveCurrentSession();
            }, 30000);
        }
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [messages, hasUnsavedChanges]);

    // Save session when component unmounts or page unloads
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasUnsavedChanges && messages.length > 1) {
                saveCurrentSession();
                e.preventDefault();
                e.returnValue = '';
            }
        };

        const handleUnload = () => {
            if (hasUnsavedChanges && messages.length > 1) {
                saveCurrentSession();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('unload', handleUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('unload', handleUnload);
            if (hasUnsavedChanges && messages.length > 1) {
                saveCurrentSession();
            }
        };
    }, [hasUnsavedChanges, messages]);

    // Test connection to AI service
    const testConnection = async () => {
        try {
            const token = localStorage.getItem("token") || sessionStorage.getItem("token");
            if (!token) {
                setConnectionStatus("error");
                setLastError("Authentication required");
                return;
            }

            // Use rate limiter for connection test
            await rateLimiter.makeRequest(async () => {
                const response = await fetch(`${baseApi}/ai-tutor/chat`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        message: "test connection",
                        context: "general",
                        sessionId: currentSessionId,
                    }),
                });

                const data = await response.json();

                if (response.ok) {
                    setConnectionStatus("connected");
                    setLastError(null);
                } else if (response.status === 503) {
                    setConnectionStatus("error");
                    setLastError("Gemini AI service temporarily unavailable");
                } else if (response.status === 401) {
                    setConnectionStatus("error");
                    setLastError("Authentication failed");
                } else if (response.status === 429) {
                    setConnectionStatus("rate_limited");
                    setLastError("Rate limit exceeded - requests are being queued");
                } else {
                    setConnectionStatus("error");
                    setLastError(data.message || "AI service connection failed");
                }
            });

        } catch (error) {
            console.error("Connection test failed:", error);
            if (error.message && error.message.includes('429')) {
                setConnectionStatus("rate_limited");
                setLastError("Rate limit exceeded");
            } else {
                setConnectionStatus("error");
                setLastError("AI service unreachable");
            }
        }
    };

    // Save current chat session
    const saveCurrentSession = async () => {
        if (!currentSessionId || messages.length <= 1 || isSaving) return;

        setIsSaving(true);
        try {
            const token = localStorage.getItem("token") || sessionStorage.getItem("token");
            if (!token) return;

            const apiMessages = messages
                .slice(1)
                .map((msg) => ({
                    role: msg.isBot ? "assistant" : "user",
                    content: msg.text,
                    timestamp: msg.timestamp.toISOString(),
                }));

            if (apiMessages.length === 0) return;

            const response = await fetch(`${baseApi}/ai-tutor/save-session`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    sessionId: currentSessionId,
                    messages: apiMessages,
                    context: determineOverallContext(),
                    title: generateSessionTitle(),
                }),
            });

            if (response.ok) {
                setHasUnsavedChanges(false);
                loadChatHistory();
            } else {
                console.error("Failed to save session");
            }
        } catch (error) {
            console.error("Error saving session:", error);
        } finally {
            setIsSaving(false);
        }
    };

    // Generate session title from first user message
    const generateSessionTitle = () => {
        const firstUserMessage = messages.find(msg => !msg.isBot);
        if (firstUserMessage) {
            const content = firstUserMessage.text.trim();
            return content.length > 50 ? content.substring(0, 50) + '...' : content;
        }
        return 'Chat Session';
    };

    // Determine overall context from messages
    const determineOverallContext = () => {
        const userMessages = messages.filter(msg => !msg.isBot).map(msg => msg.text.toLowerCase());
        const allText = userMessages.join(' ');

        if (allText.includes('math') || allText.includes('calculate') || /\d+\s*[+\-*/]\s*\d+/.test(allText)) return 'math';
        if (allText.includes('science') || allText.includes('physics') || allText.includes('chemistry') || allText.includes('biology')) return 'science';
        if (allText.includes('study') || allText.includes('exam') || allText.includes('test')) return 'study_tips';
        if (allText.includes('homework') || allText.includes('assignment')) return 'assignment';
        return 'general';
    };

    // Load chat history
    const loadChatHistory = async () => {
        try {
            const token = localStorage.getItem("token") || sessionStorage.getItem("token");
            if (!token) return;

            const response = await fetch(`${baseApi}/ai-tutor/chat-history?limit=10&page=1`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setChatHistory(data.chatSessions || []);
            }
        } catch (error) {
            console.error("Error loading chat history:", error);
        }
    };

    // FIXED: Load specific chat session and allow continuing the conversation
    const loadChatSession = async (sessionId) => {
        try {
            // Save current session if there are unsaved changes
            if (hasUnsavedChanges && currentSessionId && messages.length > 1 && currentSessionId !== sessionId) {
                await saveCurrentSession();
            }

            const token = localStorage.getItem("token") || sessionStorage.getItem("token");
            if (!token) return;

            const response = await fetch(`${baseApi}/ai-tutor/session/${sessionId}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                const session = data.chatSession;

                // Create the loaded messages array
                const loadedMessages = [];

                // Add continuation welcome message instead of replacing the original
                loadedMessages.push({
                    id: 0,
                    text: `# Continuing Your Study Session! 📚\n\nWelcome back, **${studentName}**! I'm your **AI Study Buddy** powered by **BeaconPort**.\n\nI've loaded our previous conversation. **You can continue asking questions or start a new topic** - I'm here to help! 🚀\n\n---`,
                    isBot: true,
                    timestamp: new Date(session.startTime),
                });

                // Add all the saved messages from the session
                session.messages.forEach((msg, index) => {
                    loadedMessages.push({
                        id: index + 1,
                        text: msg.content,
                        isBot: msg.role === "assistant",
                        timestamp: new Date(msg.timestamp),
                    });
                });

                // Set the loaded messages and session ID
                setMessages(loadedMessages);
                setCurrentSessionId(sessionId);
                setHasUnsavedChanges(false);
                setShowHistory(false);

                // Scroll to bottom to show the most recent messages
                setTimeout(scrollToBottom, 100);
            }
        } catch (error) {
            console.error("Error loading chat session:", error);
        }
    };

    // Delete chat session
    const deleteChatSession = async (sessionId) => {
        try {
            const token = localStorage.getItem("token") || sessionStorage.getItem("token");
            if (!token) return;

            const response = await fetch(`${baseApi}/ai-tutor/session/${sessionId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                loadChatHistory();
                if (sessionId === currentSessionId) {
                    startNewChat();
                }
            }
        } catch (error) {
            console.error("Error deleting chat session:", error);
        }
    };

    // Test connection when component mounts
    useEffect(() => {
        testConnection();
        loadChatHistory();
    }, []);

    // AI API Integration Function with Rate Limiting
    const callAIAPI = async (userMessage) => {
        try {
            const token = localStorage.getItem("token") || sessionStorage.getItem("token");

            if (!token) {
                setConnectionStatus("error");
                setLastError("Authentication required");
                throw new Error("Authentication required");
            }

            const previousMessages = messages.slice(-10).map((msg) => ({
                role: msg.isBot ? "assistant" : "user",
                content: msg.text,
                timestamp: msg.timestamp.toISOString(),
            }));

            // Use rate limiter for API call
            const response = await rateLimiter.makeRequest(async () => {
                return await fetch(`${baseApi}/ai-tutor/chat`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        message: userMessage,
                        context: determineContext(userMessage),
                        previous_messages: previousMessages,
                        sessionId: currentSessionId,
                    }),
                });
            });

            const data = await response.json();

            if (!response.ok) {
                setConnectionStatus("error");
                if (response.status === 401) {
                    setLastError("Authentication failed");
                    throw new Error("Please log in to use the AI tutor");
                } else if (response.status === 503) {
                    setLastError("AI service temporarily unavailable");
                    throw new Error(data.message || "AI service is temporarily unavailable");
                } else if (response.status === 429) {
                    setConnectionStatus("rate_limited");
                    setLastError("Rate limit exceeded - request queued");
                    throw new Error("Rate limit exceeded. Your request has been queued and will be processed automatically.");
                } else {
                    setLastError(data.message || "AI service error");
                    throw new Error(data.message || "AI service error");
                }
            }

            if (data.sessionId && data.sessionId !== currentSessionId) {
                setCurrentSessionId(data.sessionId);
                setHasUnsavedChanges(true);
                loadChatHistory();
            }

            setConnectionStatus("connected");
            setLastError(null);
            setHasUnsavedChanges(true);

            return data.response || "I apologize, but I'm having trouble processing your request right now. Please try again.";
        } catch (error) {
            console.error("API call error:", error);

            if (error.message.includes("Authentication")) {
                setConnectionStatus("error");
                return "Please log in to use the AI tutor service.";
            } else if (error.message.includes("Rate limit")) {
                setConnectionStatus("rate_limited");
                return "Your request has been queued due to rate limits and will be processed automatically. Please wait...";
            } else {
                setConnectionStatus("error");
                return error.message || "AI service is currently unavailable. Please try again later.";
            }
        }
    };

    // Determine context based on user message
    const determineContext = (message) => {
        const text = message.toLowerCase();
        if (text.includes("math") || text.includes("calculate") || text.includes("equation") || text.includes("solve") || /\d+\s*[+\-*/]\s*\d+/.test(text)) return "math";
        if (text.includes("science") || text.includes("physics") || text.includes("chemistry") || text.includes("biology")) return "science";
        if (text.includes("study") || text.includes("exam") || text.includes("test")) return "study_tips";
        if (text.includes("homework") || text.includes("assignment")) return "assignment";
        if (text.includes("exam") || text.includes("preparation")) return "exam_prep";
        return "general";
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const messageText = inputValue;
        if (!messageText.trim()) return;

        const userMessage = {
            id: Date.now(),
            text: messageText,
            isBot: false,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputValue("");
        setIsLoading(true);

        try {
            const aiResponse = await callAIAPI(messageText);
            const botResponse = {
                id: Date.now() + 1,
                text: aiResponse,
                isBot: true,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, botResponse]);
        } catch (error) {
            console.error("Error getting AI response:", error);
            const errorResponse = {
                id: Date.now() + 1,
                text: "## ❌ Response Error\n\nI apologize, but I'm having trouble responding right now. This could be due to:\n\n• **Network connectivity issues**\n• **Temporary service disruption**\n• **High server load**\n\n**Please try again in a moment.** If the problem persists, you can contact support.",
                isBot: true,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorResponse]);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleChat = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            testConnection();
        }
    };

    const minimizeChat = async () => {
        if (hasUnsavedChanges && currentSessionId && messages.length > 1) {
            await saveCurrentSession();
        }
        setIsOpen(false);
    };

    const closeAndClearChat = async () => {
        if (hasUnsavedChanges && currentSessionId && messages.length > 1) {
            await saveCurrentSession();
        }

        setIsOpen(false);
        setCurrentSessionId(null);
        setMessages([
            {
                id: 1,
                text: `# Welcome Back, **${studentName}**! 🎓\n\nI'm your **AI Study Buddy** powered by **BeaconPort**. Ready to start a fresh learning session?\n\n## What I Can Help You With:\n\n• **📚 Subject Explanations** - Break down complex topics\n• **🧮 Problem Solving** - Step-by-step solutions\n• **📝 Study Strategies** - Effective learning techniques\n• **🎯 Exam Preparation** - Practice and review\n• **📖 Assignment Support** - Guidance and feedback\n\n---\n\n**What would you like to learn today?** 🚀`,
                isBot: true,
                timestamp: new Date(),
            },
        ]);
        setHasUnsavedChanges(false);
        setShowHistory(false);
    };

    const startNewChat = async () => {
        if (hasUnsavedChanges && currentSessionId && messages.length > 1) {
            await saveCurrentSession();
        }

        setCurrentSessionId(null);
        setMessages([
            {
                id: 1,
                text: `# New Study Session Started! 🎓\n\nHello **${studentName}**! I'm your **AI Study Buddy** powered by **BeaconPort**.\n\n## Ready to Learn Something New?\n\n• **📚 Ask me about any subject** - Math, Science, History, Literature, and more\n• **🧮 Get step-by-step solutions** - I'll walk you through problems clearly\n• **📝 Learn effective study techniques** - Maximize your learning potential\n• **🎯 Prepare for exams** - Practice questions and strategies\n• **📖 Get assignment help** - Guidance without doing the work for you\n\n---\n\n**What topic would you like to explore?** Just ask me anything! 🚀`,
                isBot: true,
                timestamp: new Date(),
            },
        ]);
        setHasUnsavedChanges(false);
        setShowHistory(false);
    };

    const handleManualSave = async () => {
        if (currentSessionId && messages.length > 1) {
            await saveCurrentSession();
        }
    };

    // Resize handlers (disabled on mobile)
    const handleResizeStart = (e) => {
        if (isMobile) return;
        setIsResizing(true);
        setResizeStart({
            x: e.clientX,
            y: e.clientY,
            width: chatSize.width,
            height: chatSize.height,
        });
        e.preventDefault();
    };

    const handleResizeMove = (e) => {
        if (!isResizing || isMobile) return;

        const deltaX = resizeStart.x - e.clientX;
        const deltaY = e.clientY - resizeStart.y;

        const newWidth = Math.max(300, Math.min(800, resizeStart.width + deltaX));
        const newHeight = Math.max(400, Math.min(800, resizeStart.height + deltaY));

        setChatSize({ width: newWidth, height: newHeight });
    };

    const handleResizeEnd = () => {
        setIsResizing(false);
    };

    useEffect(() => {
        if (isResizing && !isMobile) {
            document.addEventListener("mousemove", handleResizeMove);
            document.addEventListener("mouseup", handleResizeEnd);
            return () => {
                document.removeEventListener("mousemove", handleResizeMove);
                document.removeEventListener("mouseup", handleResizeEnd);
            };
        }
    }, [isResizing, resizeStart, isMobile]);

    // Connection status indicator
    const getStatusColor = () => {
        switch (connectionStatus) {
            case "connected": return "bg-green-400";
            case "disconnected": return "bg-red-400";
            case "error": return "bg-red-400";
            case "checking": return "bg-yellow-400";
            default: return "bg-gray-400";
        }
    };

    const getStatusText = () => {
        switch (connectionStatus) {
            case "connected": return "AI Connected";
            case "disconnected": return "AI Disconnected";
            case "error": return `AI Error${lastError ? `: ${lastError}` : ""}`;
            case "checking": return "Connecting...";
            default: return "Unknown Status";
        }
    };

    const retryConnection = async () => {
        setConnectionStatus("checking");
        await testConnection();
    };

    // Responsive chat dimensions
    const getChatDimensions = () => {
        if (isMobile) {
            return {
                width: '98vw',
                height: '98vh',
                maxWidth: 'none',
                maxHeight: 'none'
            };
        }
        return {
            width: `${chatSize.width}px`,
            height: `${chatSize.height}px`,
            maxWidth: '90vw',
            maxHeight: '90vh'
        };
    };

    const getChatPosition = () => {
        if (isMobile) {
            return 'fixed top-0 mt-15 justify-center  rounded-lg mx-auto z-[1000]';
        }
        return 'fixed bottom-3 right-6 z-[1000]';
    };

    const getInitials = (name) => {
        if (!name || typeof name !== 'string') {
            return '?';
        }

        const trimmedName = name.trim();
        if (trimmedName.length === 0) {
            return '?';
        }

        const words = trimmedName.split(/\s+/);
        const initials = words
            .map(word => word.charAt(0).toUpperCase())
            .join('');

        return initials || '?';
    };

    return (
        <div className={getChatPosition()}>
            {/* Floating Chat Icon */}
            {!isOpen && (
                <button
                    onClick={toggleChat}
                    className={"cursor-pointer bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-black p-4 rounded-lg shadow-lg transform transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-amber-300 fixed bottom-5 right-5 z-[1000] "}>
                    <GraduationCap size={isMobile ? 24 : 30} />
                    <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse ${getStatusColor()}`} />
                    {hasUnsavedChanges && (
                        <div className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                    )}
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div
                    ref={chatRef}
                    className={`
                        bg-gray-900 border-2 overflow-hidden border-amber-600 shadow-2xl flex flex-col 
                        animate-in slide-in-from-bottom-5 duration-300 relative
                        ${isMobile ? 'rounded-lg ' : 'rounded-lg'}
                    `}
                    style={getChatDimensions()}
                >
                    {/* Resize Handle - Desktop only */}
                    {!isMobile && (
                        <div
                            className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize opacity-0 hover:opacity-100 bg-amber-600 rounded-br-lg transition-opacity z-10"
                            onMouseDown={handleResizeStart}
                            title="Resize"
                        >
                            <Maximize2 size={12} className="text-white m-0.5" />
                        </div>
                    )}

                    {/* Header */}
                    <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-black p-3 flex items-center justify-between border-b border-amber-500">
                        <div className="flex items-center space-x-3">
                            <TutorIcon />
                            <div className="flex flex-col">
                                <h3 className="text-sm font-bold">AI Study Buddy</h3>
                                <div className="flex items-center space-x-2">
                                    <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
                                    <span className="text-xs opacity-90">{getStatusText()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-1">
                            {/* Connection Status Actions */}
                            {connectionStatus === "error" && (
                                <button
                                    onClick={retryConnection}
                                    className="p-1 hover:bg-black/10 rounded transition-colors"
                                    title="Retry Connection"
                                >
                                    <RefreshCw size={16} />
                                </button>
                            )}

                            {/* Save Button */}
                            <button
                                onClick={handleManualSave}
                                disabled={isSaving || !hasUnsavedChanges || messages.length <= 1}
                                className="p-1 hover:bg-black/10 rounded transition-colors disabled:opacity-50"
                                title="Save Session"
                            >
                                <Save size={16} />
                            </button>

                            {/* History Toggle */}
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className="p-1 hover:bg-black/10 rounded transition-colors"
                                title="Chat History"
                            >
                                <History size={16} />
                            </button>

                            {/* New Chat */}
                            <button
                                onClick={startNewChat}
                                className="p-1 hover:bg-black/10 rounded transition-colors"
                                title="New Chat"
                            >
                                <BookOpen size={16} />
                            </button>

                            {/* Minimize */}
                            <button
                                onClick={minimizeChat}
                                className="p-1 hover:bg-black/10 rounded transition-colors"
                                title="Minimize"
                            >
                                <Minus size={16} />
                            </button>

                            {/* Close */}
                            <button
                                onClick={closeAndClearChat}
                                className="p-1 hover:bg-black/10 rounded transition-colors"
                                title="Close & Clear"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Chat History Sidebar */}
                    {showHistory && (
                        <div className="bg-gray-800 border-b border-gray-700 max-h-48 overflow-y-auto">
                            <div className="p-3">
                                <h4 className="text-amber-300 font-semibold text-sm mb-2">Recent Sessions</h4>
                                {chatHistory.length === 0 ? (
                                    <p className="text-gray-400 text-xs">No saved sessions yet</p>
                                ) : (
                                    <div className="space-y-2">
                                        {chatHistory.map((session) => (
                                            <div
                                                key={session.sessionId}
                                                className="bg-gray-700 rounded p-2 text-xs hover:bg-gray-600 transition-colors group"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <button
                                                        onClick={() => loadChatSession(session.sessionId)}
                                                        className="flex-1 text-left text-gray-200 hover:text-amber-300 transition-colors truncate"
                                                        title={session.title}
                                                    >
                                                        {session.title}
                                                    </button>
                                                    <button
                                                        onClick={() => deleteChatSession(session.sessionId)}
                                                        className="ml-2 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        title="Delete Session"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                                <div className="text-gray-400 text-xs mt-1">
                                                    {new Date(session.lastActivity).toLocaleDateString()} • {session.messageCount} messages
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Messages Area */}
                    <div className="flex-1 scroll-container overflow-y-auto p-4 space-y-4 bg-gray-900">
                        {messages.map((message) => (
                            <div key={message.id} className={`flex mb-4 ${message.isBot ? "justify-start" : "justify-end"}`}>
                                {message.isBot && (
                                    // Bot Icon (only show for bot messages on the left)
                                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-amber-500 text-black font-bold mr-3 flex-shrink-0">
                                        <TutorIcon size={16} className="text-amber-900" />
                                    </div>
                                )}

                                {/* Message Container */}
                                <div className={`max-w-[70%] flex flex-col ${message.isBot ? "" : "items-end"}`}>
                                    {message.isBot && (
                                        <div className="flex items-center mb-1 ml-1">
                                            <span className="text-xs font-medium text-amber-400">AI Study Buddy</span>
                                        </div>
                                    )}

                                    <div className={`p-3 rounded-lg shadow-md ${message.isBot
                                        ? "bg-gray-800 text-gray-100 border border-gray-700 rounded-tl-none"
                                        : "bg-gradient-to-r from-amber-600 to-orange-600 text-black rounded-tr-none"
                                        }`}>
                                        <MessageContent message={message} isBot={message.isBot} />
                                    </div>

                                    {/* Timestamp */}
                                    <div className={`text-xs mt-1 ${message.isBot ? "text-gray-400 ml-1" : "text-gray-400 mr-1"}`}>
                                        {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </div>
                                </div>

                                {!message.isBot && (
                                    // Student's Initials Icon (only show for user messages on the right)
                                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-amber-600 text-black font-bold ml-3 flex-shrink-0">
                                        {getInitials(studentName)}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Loading Message */}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="max-w-[85%] p-3 rounded-lg bg-gray-800 text-gray-100 border border-gray-700">
                                    <div className="flex items-center mb-2">
                                        <TutorIcon size={16} />
                                        <span className="ml-2 text-xs font-medium text-amber-300">AI Study Buddy</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <div className="flex space-x-1">
                                            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                                            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                                        </div>
                                        <span className="text-sm text-gray-300">Thinking...</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Status Messages */}
                        {connectionStatus === "error" && (
                            <div className="bg-red-900/50 border border-red-600 p-3 rounded-lg">
                                <div className="flex items-center space-x-2">
                                    <AlertCircle size={16} className="text-red-400" />
                                    <span className="text-red-300 text-sm font-medium">Connection Error</span>
                                </div>
                                <p className="text-red-200 text-xs mt-1">{lastError}</p>
                            </div>
                        )}

                        {/* Auto-save indicator */}
                        {isSaving && (
                            <div className="text-center">
                                <span className="text-xs text-gray-400">Saving session...</span>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>


                    {/* Input Area */}
                    <div className="p-4 border-t border-gray-700 bg-gray-900">
                        <form onSubmit={handleSubmit} className="flex space-x-2">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={
                                    connectionStatus === "connected"
                                        ? "Ask me anything about studies..."
                                        : "AI service unavailable..."
                                }
                                disabled={isLoading || connectionStatus !== "connected"}
                                className="flex-1 p-3 bg-gray-800 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !inputValue.trim() || connectionStatus !== "connected"}
                                className="p-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-black rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-amber-600 disabled:hover:to-orange-600"
                            >
                                <Send size={20} />
                            </button>
                        </form>

                        {/* Status Bar */}
                        <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                            <div className="flex items-center space-x-4">
                                {hasUnsavedChanges && (
                                    <span className="text-blue-400">• Unsaved changes</span>
                                )}
                            </div>
                            <div className="text-right">
                                Powered by BeaconPort AI
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatBot;