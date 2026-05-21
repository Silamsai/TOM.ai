/**
 * geminiService.js
 * Google Gemini AI — using official @google/generative-ai SDK
 * FREE tier: 15 requests/min, 1 million tokens/day
 * Get API key: https://aistudio.google.com/app/apikey
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const path = require('path');
const ChatHistory = require('../models/ChatHistory');
const { buildRAGContext } = require('./ragService');

// ---- MCP Setup ----------------------------------------------------
const mcpServerPath = path.join(__dirname, '../../MCP-servers/gmail-mcp/server.js');
let mcpClientInstance = null;
let mcpTools = [];

async function getMCPClient() {
  if (mcpClientInstance) return mcpClientInstance;
  
  try {
    const transport = new StdioClientTransport({
      command: 'node',
      args: [mcpServerPath]
    });
    
    const client = new Client({ name: 'tom-ai-backend', version: '1.0.0' }, { capabilities: {} });
    await client.connect(transport);
    mcpClientInstance = client;
    
    const toolsResponse = await client.listTools();
    mcpTools = toolsResponse.tools;
    console.log(`[MCP] Connected to Gmail MCP. Found ${mcpTools.length} tools.`);
  } catch (error) {
    console.error(`[MCP] Failed to connect to MCP server:`, error.message);
    // Don't crash the whole app if MCP fails, just return null so Gemini runs without it
    mcpClientInstance = null;
  }
  
  return mcpClientInstance;
}

const mcpToGeminiType = (type) => {
  const map = {
    'string': 'STRING',
    'number': 'NUMBER',
    'integer': 'INTEGER',
    'boolean': 'BOOLEAN',
    'object': 'OBJECT',
    'array': 'ARRAY',
  };
  return map[type] || 'STRING';
};

const mapMCPToolToGemini = (tool) => {
  return {
    name: tool.name,
    description: tool.description,
    parameters: {
      type: 'OBJECT',
      properties: Object.entries(tool.inputSchema?.properties || {}).reduce((acc, [key, val]) => {
        acc[key] = {
          type: mcpToGeminiType(val.type),
          description: val.description || '',
        };
        return acc;
      }, {}),
      required: tool.inputSchema?.required || [],
    }
  };
};

/**
 * Sends a user message to Gemini and returns the AI response.
 * Drop-in replacement for claudeService.sendMessage()
 */
const sendMessage = async (userId, userMessage, user) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured in .env');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Initialize MCP tools if not already done
  await getMCPClient();
  const geminiTools = mcpTools.map(mapMCPToolToGemini);

  // Fetch recent chat history from MongoDB for context memory
  let formattedHistory = [];
  try {
    const rawHistory = await ChatHistory.find({ userId })
      .sort({ timestamp: -1 })
      .limit(8)
      .lean();

    // Reverse history to chronological order (oldest to newest)
    const chronologicalHistory = rawHistory.reverse();
    
    formattedHistory = chronologicalHistory.map(h => [
      { role: 'user', parts: [{ text: h.userMessage || '' }] },
      { role: 'model', parts: [{ text: h.claudeResponse || '' }] }
    ]).flat();
  } catch (error) {
    console.error('[Gemini] Failed to fetch chat history context:', error.message);
  }

  // Models available for this API key
  const models = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
  ];

  // Retrieve relevant personal context (RAG)
  const userText = typeof userMessage === 'object' && userMessage.text ? userMessage.text : String(userMessage);
  const ragContext = await buildRAGContext(userId, userText);

  const systemPrompt = `You are TOM.AI, a smart, friendly, empathetic, and highly capable personal AI assistant for ${user?.name || 'the user'}.

You help with anything: general knowledge, science, history, math, coding, writing, task planning, and everyday questions.
You ALSO have access to the user's Gmail via tools. If the user asks to read, search, or check their emails, USE THE TOOLS PROVIDED.

CRITICAL INSTRUCTION: If the user asks you to GENERATE AN IMAGE, you MUST reply with a markdown image tag pointing to Pollinations AI:
![Generated Image](https://image.pollinations.ai/prompt/{url_encoded_detailed_description}?width=1024&height=1024&nologo=true)
Do NOT say you cannot generate images. You CAN generate images using this markdown trick. Always use a highly descriptive, comma-separated prompt for the URL.

Response Guidelines for Premium User Experience:
- Answer QUICKLY, naturally, and concisely. Keep responses conversational, snappy, and human-like.
- **Adaptive Formatting Styles**:
  * If the user requests a "sheet style" or "table style", format the data (such as emails, tasks, etc.) into clean Markdown tables with columns.
  * If the user requests a "report style", format the response with clear headers, bullet points, summary sections, and key takeaways.
  * Avoid unnecessary preambles or explanations unless requested.
- Show emotional intelligence and empathy: match the user's tone (humorous, serious, excited, or relaxed).
- Format lists and code using markdown when helpful.
- Always respond in the same language the user writes in.
- Be proactive: after helping, offer related suggestions.

Current user: ${user?.name || 'User'} (${user?.email || ''})
Current date/time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST${ragContext}`;

  let lastError;

  for (const modelName of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const modelConfig = { 
          model: modelName,
          systemInstruction: systemPrompt,
        };
        
        if (geminiTools.length > 0) {
          modelConfig.tools = [{ functionDeclarations: geminiTools }];
        }

        const model = genAI.getGenerativeModel(modelConfig);

        // Start chat session with recent conversation history
        const chat = model.startChat({
          history: formattedHistory
        });
        
        let contentParts = [];
        if (typeof userMessage === 'object' && userMessage.text) {
          contentParts.push(userMessage.text); // Gemini sometimes prefers string for text, but let's use string
          if (userMessage.attachments && userMessage.attachments.length > 0) {
            contentParts = [userMessage.text, ...userMessage.attachments];
          } else {
            contentParts = userMessage.text;
          }
        } else {
          contentParts = String(userMessage);
        }

        let result = await chat.sendMessage(contentParts);
        
        let functionCalls = result.response.functionCalls && typeof result.response.functionCalls === 'function' 
          ? result.response.functionCalls() 
          : result.response.functionCalls;
        
        let loopCount = 0;
        
        // Handle tool calls recursively (up to 5 depths)
        while (functionCalls && functionCalls.length > 0 && loopCount < 5) {
          loopCount++;
          const functionResponses = [];
          
          for (const call of functionCalls) {
            console.log(`[Gemini] 🛠️ Calling MCP Tool: ${call.name} with args:`, call.args);
            
            try {
              if (!mcpClientInstance) throw new Error("MCP Client not connected");
              
              const mcpResponse = await mcpClientInstance.callTool({
                name: call.name,
                arguments: call.args
              });
              
              let responseObj;
              if (mcpResponse.isError) {
                responseObj = { error: mcpResponse.content[0].text };
              } else {
                try {
                  responseObj = JSON.parse(mcpResponse.content[0].text);
                } catch (e) {
                  responseObj = { result: mcpResponse.content[0].text };
                }
              }
              
              functionResponses.push({
                functionResponse: {
                  name: call.name,
                  response: responseObj
                }
              });
            } catch (err) {
              console.error(`[Gemini] Tool error:`, err.message);
              functionResponses.push({
                functionResponse: {
                  name: call.name,
                  response: { error: err.message }
                }
              });
            }
          }
          
          // Send tool results back to Gemini
          result = await chat.sendMessage(functionResponses);
          functionCalls = result.response.functionCalls && typeof result.response.functionCalls === 'function' 
            ? result.response.functionCalls() 
            : result.response.functionCalls;
        }

        let text = "";
        try {
          text = result.response.text();
        } catch (e) {}
        
        if (!text || text.trim() === '') {
          text = "I checked your request but didn't have a verbal response. (Action completed)";
        }

        const usage = result.response.usageMetadata || {};

        console.log(`[Gemini] ✅ Model: ${modelName}, Tokens in: ${usage.promptTokenCount || 0}, out: ${usage.candidatesTokenCount || 0}`);

        return {
          response: text,
          usage: {
            input: usage.promptTokenCount || 0,
            output: usage.candidatesTokenCount || 0,
          },
        };
      } catch (error) {
        lastError = error;
        const msg = error.message || '';
        console.error(`[Gemini] ❌ Model ${modelName} attempt ${attempt}:`, msg.substring(0, 120));
        console.error(`[Gemini] FULL ERROR DETAILS:`, JSON.stringify(error, null, 2));

        // If quota exceeded, try next model immediately
        if (msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) break;

        // Wait before retry
        if (attempt < 2) await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }

  // All models failed — use local fallback
  console.warn('[Gemini] All models failed, using local fallback. Error:', lastError?.message?.substring(0, 100));
  return {
    response: localFallback(userMessage),
    usage: { input: 0, output: 0 },
  };
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const localFallback = (userMessage) => {
  const msg = userMessage.toLowerCase().trim();

  if (/^(hi|hello|hey|good (morning|afternoon|evening|night)|howdy|yo|sup)\b/.test(msg))
    return pick([`Hey! 👋 I'm TOM.AI. Ask me anything!`, `Hello! What can I help you with today?`, `Hi there! Ready to help.`]);

  if (/\b(time|date|today|day is it)\b/.test(msg)) {
    const now = new Date();
    return `It's **${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}** right now.`;
  }

  return `I'm having trouble connecting to my AI brain right now. Please try again in a moment!`;
};

/**
 * Parses Gemini response for task/reminder intents.
 */
const parseGeminiResponse = (responseText) => {
  const lower = responseText.toLowerCase();
  const hasTaskIntent =
    lower.includes('task created') ||
    lower.includes('added to your tasks') ||
    lower.includes("i'll add") ||
    lower.includes("i've created a task");
  const hasReminderIntent =
    lower.includes('reminder set') ||
    lower.includes("i'll remind") ||
    lower.includes('reminder has been');
  let extractedTask = null;
  const taskMatch = responseText.match(/task[:\s"']+([^"'\n.]+)/i);
  if (taskMatch) extractedTask = taskMatch[1].trim();
  return { hasTaskIntent, hasReminderIntent, extractedTask };
};

module.exports = { sendMessage, parseClaudeResponse: parseGeminiResponse };
