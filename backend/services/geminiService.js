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
const axios = require('axios');
const ChatHistory = require('../models/ChatHistory');
const { buildRAGContext, searchPersonalDocuments } = require('./ragService');

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
const callOpenAI = async (model, userMessage, history, systemPrompt) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const messages = [
    { role: 'system', content: systemPrompt }
  ];
  
  history.forEach(h => {
    messages.push({ role: 'user', content: h.userMessage || '' });
    messages.push({ role: 'assistant', content: h.claudeResponse || '' });
  });

  const textMsg = typeof userMessage === 'object' && userMessage.text ? userMessage.text : String(userMessage);
  messages.push({ role: 'user', content: textMsg });

  const res = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: model === 'gpt-4o-mini' ? 'gpt-4o-mini' : 'gpt-4o',
    messages,
    max_tokens: 2048
  }, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  const choice = res.data.choices[0];
  return {
    response: choice.message.content,
    usage: {
      input: res.data.usage?.prompt_tokens || 0,
      output: res.data.usage?.completion_tokens || 0
    }
  };
};

const callAnthropic = async (model, userMessage, history, systemPrompt) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const messages = [];
  
  history.forEach(h => {
    messages.push({ role: 'user', content: h.userMessage || '' });
    messages.push({ role: 'assistant', content: h.claudeResponse || '' });
  });

  const textMsg = typeof userMessage === 'object' && userMessage.text ? userMessage.text : String(userMessage);
  messages.push({ role: 'user', content: textMsg });

  const res = await axios.post('https://api.anthropic.com/v1/messages', {
    model: model === 'claude-4.8-opus' ? 'claude-3-opus-20240229' : 'claude-3-5-sonnet-20241022',
    system: systemPrompt,
    messages,
    max_tokens: 2048
  }, {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    }
  });

  return {
    response: res.data.content[0].text,
    usage: {
      input: res.data.usage?.input_tokens || 0,
      output: res.data.usage?.output_tokens || 0
    }
  };
};

/**
 * Sends a user message to Gemini and returns the AI response.
 * Drop-in replacement for claudeService.sendMessage()
 */
const sendMessage = async (userId, userMessage, user, selectedModel = 'gemini-2.5-flash', mode = 'standard') => {
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
  let rawHistory = [];
  try {
    rawHistory = await ChatHistory.find({ userId })
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
  let models = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
  ];
  if (selectedModel === 'gemini-2.5-pro') {
    models = ['gemini-2.5-pro', 'gemini-2.5-flash'];
  }

  // Retrieve relevant personal context (RAG)
  const userText = typeof userMessage === 'object' && userMessage.text ? userMessage.text : String(userMessage);
  let ragContext = '';
  if (mode === 'personal') {
    const results = await searchPersonalDocuments(userId, userText, 6);
    if (results.length > 0) {
      const contextLines = results.map(
        (r, i) => `[Document: ${r.metadata?.fileName || 'source'}, Chunk: ${r.metadata?.chunkIndex || i + 1}]: ${r.content}`
      );
      ragContext = `\n\nCRITICAL CONTEXT FROM USER UPLOADED DOCUMENTS:\n${contextLines.join('\n\n')}\n\nINSTRUCTION: You must base your answer ONLY on the context above. State the name of the file/document where the information was found. If the answer cannot be found in the context, say: "I couldn't find the answer in your uploaded documents."`;
    } else {
      ragContext = `\n\nNo uploaded documents found in user's personal RAG pipeline. Tell the user politely that they need to upload documents first in the Knowledge Base panel to ask questions here.`;
    }
  } else {
    ragContext = await buildRAGContext(userId, userText);
  }

  const persona = user?.aiPersona || 'professional';
  let personaGuideline = '';
  if (persona === 'professional') {
    personaGuideline = `- **AI Assistant Persona (Professional & Structured)**: You are highly competent, direct, organized, and clear. Avoid excessive greetings or filler words. Focus on highly professional, accurate, structured business-ready answers. Keep responses concise and highly actionable.`;
  } else if (persona === 'creative') {
    personaGuideline = `- **AI Assistant Persona (Creative & Expressive)**: You are incredibly imaginative, friendly, warm, and highly expressive. Use rich analogies, encouraging metaphors, and supportive words to make your responses vibrant, creative, and engaging.`;
  } else if (persona === 'sarcastic') {
    personaGuideline = `- **AI Assistant Persona (Witty & Sarcastic)**: You are dryly sarcastic, highly witty, and love clever, playful banter, but still extremely intelligent and helpful. Sprinkle in witty remarks, gentle teasing, or dry humor, but ensure you ALWAYS solve the user's query perfectly and with complete accuracy. Be a fun, witty buddy!`;
  } else if (persona === 'empathetic') {
    personaGuideline = `- **AI Assistant Persona (Empathetic Coach)**: You are deeply compassionate, listening, validating, and incredibly supportive. Provide gentle guidance, validate feelings when appropriate, and speak with extreme warmth, patience, and encouragement.`;
  }

  let simulationGuideline = '';
  if (selectedModel === 'gemini-3.5-flash') {
    simulationGuideline = `\n- **AI Assistant Model (Gemini 3.5 Flash - Simulated)**: Respond in a prompt, cutting-edge, extremely intelligent, fast, and helpful tone. Maintain the persona of the latest generation of Gemini models.`;
  } else if (selectedModel === 'gpt-4o') {
    simulationGuideline = `\n- **AI Assistant Model (GPT-4o - Simulated)**: Emulate OpenAI's assistant style: highly structured, very detailed, organized with clear headings and markdown tables where applicable, friendly but professional, and highly capable in coding.`;
  } else if (selectedModel === 'gpt-4o-mini') {
    simulationGuideline = `\n- **AI Assistant Model (GPT-4o mini - Simulated)**: Emulate a fast, lightweight, and conversational assistant that provides concise, crisp, and direct answers without unnecessary fluff.`;
  } else if (selectedModel === 'claude-3.5-sonnet') {
    simulationGuideline = `\n- **AI Assistant Model (Claude 3.5 Sonnet - Simulated)**: Emulate Anthropic's assistant style: exceptionally articulate, intellectually deep, highly nuanced, avoiding typical AI canned phrases or preambles, and writing with extreme clarity, elegance, and precision.`;
  } else if (selectedModel === 'claude-4.8-opus') {
    simulationGuideline = `\n- **AI Assistant Model (Claude 4.8 Opus - Simulated)**: Emulate a masterful, extremely deep-thinking, creative, and empathetic assistant that excels in philosophy, coding, math, and long-form narrative. Write detailed, rich, and deeply explained responses with warmth.`;
  }

  const systemPrompt = mode === 'personal'
    ? `You are TOM.AI Personal, an advanced Retrieval-Augmented Generation (RAG) AI assistant for ${user?.name || 'the user'}.${simulationGuideline}

Your primary and sole task is to answer the user's questions based exclusively on the provided retrieved context from their uploaded personal documents.

Strict Guidelines:
1. Base your response strictly on the retrieved context below. Do not make up facts or extrapolate beyond the document data.
2. Cite the name of the file/document where you found the information. (e.g. "According to policy_brief.pdf...")
3. If the context does not contain the answer, politely state: "I couldn't find the answer in your uploaded documents."
4. Maintain a highly professional, accurate, clear, and structured tone. Avoid chatty filler words.

Current user: ${user?.name || 'User'} (${user?.email || ''})
Current date/time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST${ragContext}`
    : `You are TOM.AI, a smart, friendly, empathetic, and highly capable personal AI assistant for ${user?.name || 'the user'}.${simulationGuideline}

You help with anything: general knowledge, science, history, math, coding, writing, task planning, and everyday questions.
You ALSO have access to the user's Gmail via tools. If the user asks to read, search, or check their emails, USE THE TOOLS PROVIDED.

CRITICAL INSTRUCTION: If the user asks you to GENERATE AN IMAGE, you MUST reply with a markdown image tag pointing to Pollinations AI:
![Generated Image](https://image.pollinations.ai/prompt/{url_encoded_detailed_description}?width=1024&height=1024&nologo=true)
Do NOT say you cannot generate images. You CAN generate images using this markdown trick. Always use a highly descriptive, comma-separated prompt for the URL.

Response Guidelines for Premium User Experience:
${personaGuideline}
- Answer QUICKLY, naturally, and concisely. Keep responses conversational, snappy, and human-like.
- **Adaptive Formatting Styles**:
  * If the user requests a "sheet style" or "table style", format the data (such as emails, tasks, etc.) into clean Markdown tables with columns.
  * If the user requests a "report style", format the response with clear headings, bullet points, summary sections, and key takeaways.
  * Avoid unnecessary preambles or explanations unless requested.
- Show emotional intelligence and empathy: match the user's tone (humorous, serious, excited, or relaxed).
- Format lists and code using markdown when helpful.
- Always respond in the same language the user writes in.
- Be proactive: after helping, offer related suggestions.

Current user: ${user?.name || 'User'} (${user?.email || ''})
Current date/time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST${ragContext}`;

  // Call OpenAI API directly if key is configured
  if (selectedModel && selectedModel.startsWith('gpt-') && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
    try {
      console.log(`[OpenAI] Routing to real OpenAI API with model: ${selectedModel}`);
      return await callOpenAI(selectedModel, userMessage, rawHistory, systemPrompt);
    } catch (openaiErr) {
      console.error('[OpenAI] Failed, falling back to Gemini simulation. Error:', openaiErr.message);
    }
  }

  // Call Anthropic API directly if key is configured
  if (selectedModel && selectedModel.startsWith('claude-') && process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here') {
    try {
      console.log(`[Anthropic] Routing to real Anthropic API with model: ${selectedModel}`);
      return await callAnthropic(selectedModel, userMessage, rawHistory, systemPrompt);
    } catch (anthropicErr) {
      console.error('[Anthropic] Failed, falling back to Gemini simulation. Error:', anthropicErr.message);
    }
  }

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
