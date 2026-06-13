/**
 * RAG Service — Gemini & MongoDB Vector Search
 * Provides semantic search over user data (emails, tasks, calendar, chats)
 * using Gemini's text-embedding-004 model and MongoDB vector document storage.
 *
 * Cost-free: 100% free under same GEMINI_API_KEY.
 * No external signups/dependencies (Pinecone, OpenAI, etc. are NOT needed).
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const VectorDocument = require('../models/VectorDocument');
const PersonalDocument = require('../models/PersonalDocument');

let genAIInstance = null;

const getGenAI = () => {
  if (!genAIInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      throw new Error('GEMINI_API_KEY is not configured in .env');
    }
    genAIInstance = new GoogleGenerativeAI(apiKey);
  }
  return genAIInstance;
};

/**
 * Converts text into a 768-dimension vector embedding using Gemini gemini-embedding-001.
 * Includes retry with exponential backoff for rate-limit (429) errors.
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getEmbedding = async (text, retries = 3) => {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await model.embedContent({
        content: { parts: [{ text: text.slice(0, 8000) }] },
        outputDimensionality: 768,
      });
      return result.embedding.values;
    } catch (error) {
      const is429 = error.status === 429 || error.message?.includes('429');
      if (is429 && attempt < retries) {
        const wait = Math.pow(2, attempt) * 10000 + Math.random() * 2000; // 10s, 20s, 40s + jitter
        console.warn(`[RAG] Rate limited, retrying in ${(wait / 1000).toFixed(1)}s (attempt ${attempt + 1}/${retries})`);
        await sleep(wait);
        continue;
      }
      console.error('[RAG] Failed to get embedding from Gemini:', error.message);
      throw error;
    }
  }
};

/**
 * Calculates the Cosine Similarity between two vector arrays.
 */
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Indexes text content into MongoDB with its embedding vector.
 */
const indexDocument = async (userId, content, metadata = {}) => {
  if (!content || !content.trim()) return;
  try {
    const embedding = await getEmbedding(content);

    // If sourceId is provided (e.g. email ID or task ID), prevent duplicates
    if (metadata.sourceId) {
      await VectorDocument.deleteOne({ userId, 'metadata.sourceId': metadata.sourceId });
    }

    await VectorDocument.create({
      userId,
      content,
      embedding,
      metadata,
    });
    console.log(`[RAG] Indexed document for user: ${userId}. Type: ${metadata.type || 'unknown'}`);
  } catch (error) {
    console.error('[RAG] Index document failed:', error.message);
  }
};

/**
 * Helper function to perform highly optimized in-memory vector search.
 * Hoists query magnitude calculation and uses single-pass Top-K insertion
 * to avoid memory allocation and full sorting overhead.
 */
const performVectorSearch = (docs, queryEmbedding, k, threshold) => {
  if (docs.length === 0) return [];

  // Pre-calculate query magnitude once
  let normQuery = 0.0;
  for (let i = 0; i < queryEmbedding.length; i++) {
    normQuery += queryEmbedding[i] * queryEmbedding[i];
  }
  const magQuery = Math.sqrt(normQuery);

  const topK = [];

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const vecB = doc.embedding;
    if (!vecB || vecB.length === 0) continue;

    let dotProduct = 0.0;
    let normB = 0.0;
    
    // Single-pass computation for dot product and doc norm
    const len = Math.min(queryEmbedding.length, vecB.length);
    for (let j = 0; j < len; j++) {
      dotProduct += queryEmbedding[j] * vecB[j];
      normB += vecB[j] * vecB[j];
    }

    const score = (magQuery === 0 || normB === 0)
      ? 0
      : dotProduct / (magQuery * Math.sqrt(normB));

    if (score > threshold) {
      const scoredDoc = {
        content: doc.content,
        score,
        metadata: doc.metadata,
      };

      // Keep sorted Top-K array (Insertion sort)
      const insertIdx = topK.findIndex(item => score > item.score);
      if (insertIdx === -1) {
        if (topK.length < k) {
          topK.push(scoredDoc);
        }
      } else {
        topK.splice(insertIdx, 0, scoredDoc);
        if (topK.length > k) {
          topK.pop();
        }
      }
    }
  }

  return topK;
};

/**
 * Searches user's indexed documents using cosine similarity.
 */
const searchDocuments = async (userId, query, k = 4) => {
  if (!query || !query.trim()) return [];
  try {
    const queryEmbedding = await getEmbedding(query);
    const docs = await VectorDocument.find({ userId }).lean();
    return performVectorSearch(docs, queryEmbedding, k, 0.30);
  } catch (error) {
    console.error('[RAG] Search documents failed:', error.message);
    return [];
  }
};

// ---- Convenience indexers for different data types -------------------------

const indexEmail = async (userId, email) => {
  const content = `Email from: ${email.from}\nSubject: ${email.subject}\nDate: ${email.date}\nSnippet: ${email.snippet}`;
  await indexDocument(userId, content, { type: 'email', sourceId: email.id, date: email.date });
};

const indexCalendarEvent = async (userId, event) => {
  const content = `Calendar event: ${event.title}\nStart: ${event.start}\nEnd: ${event.end}\nDescription: ${event.description || ''}`;
  await indexDocument(userId, content, { type: 'calendar_event', sourceId: event.id, date: event.start });
};

const indexTask = async (userId, task) => {
  const content = `Task Name: ${task.taskName}\nDescription: ${task.description || ''}\nPriority: ${task.priority}\nStatus: ${task.status || 'pending'}\nDue Date: ${task.dueDate || 'none'}`;
  await indexDocument(userId, content, { type: 'task', sourceId: String(task._id) });
};

const indexChatMessage = async (userId, userMessage, botResponse) => {
  const content = `User asked: ${userMessage}\nTOM.AI replied: ${botResponse}`;
  await indexDocument(userId, content, { type: 'chat', date: new Date().toISOString() });
};

/**
 * Builds context snippet from similar documents for injecting into the AI system prompt.
 */
const buildRAGContext = async (userId, query) => {
  try {
    const results = await searchDocuments(userId, query, 4);
    if (results.length === 0) return '';

    const contextLines = results.map(
      (r, i) => `[Document ${i + 1}] (${r.metadata?.type || 'source'}): ${r.content}`
    );

    return `\n\nRelevant context retrieved from your personal data (emails, tasks, chats):\n${contextLines.join(
      '\n\n'
    )}`;
  } catch (error) {
    console.error('[RAG] buildRAGContext failed:', error.message);
    return '';
  }
};

/**
 * Searches user's uploaded personal documents using cosine similarity.
 */
const searchPersonalDocuments = async (userId, query, k = 6) => {
  if (!query || !query.trim()) return [];
  try {
    const queryEmbedding = await getEmbedding(query);
    const docs = await VectorDocument.find({ userId, 'metadata.type': 'personal_doc' }).lean();
    return performVectorSearch(docs, queryEmbedding, k, 0.0);
  } catch (error) {
    console.error('[RAG] Search personal documents failed:', error.message);
    return [];
  }
};

/**
 * Parses, chunks, batch embeds and indexes a user file (PDF, TXT, MD).
 */
const indexPersonalDocument = async (userId, file) => {
  let text = '';
  if (file.mimetype === 'application/pdf') {
    const pdfParse = require('pdf-parse/lib/pdf-parse.js');
    const data = await pdfParse(file.buffer);
    text = data.text;
  } else {
    // Treat as plain text
    text = file.buffer.toString('utf-8');
  }

  if (!text || !text.trim()) {
    throw new Error('Document has no extractable text content.');
  }

  // Chunk text: 2000 chars chunk size, 200 overlap
  // Larger chunks = fewer API calls = stays under 100 RPM free tier limit
  const chunkSize = 2000;
  const overlap = 200;
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }

  if (chunks.length === 0) {
    throw new Error('No text chunks generated.');
  }

  console.log(`[RAG] Chunked "${file.originalname}" into ${chunks.length} chunks.`);

  // Create PersonalDocument metadata record first
  const personalDoc = await PersonalDocument.create({
    userId,
    fileName: file.originalname,
    fileSize: file.size,
    mimeType: file.mimetype,
    chunkCount: chunks.length,
  });

  try {
    // Generate embeddings sequentially to respect the 100 RPM free tier limit.
    // Each request is retried with exponential backoff on 429.
    const embeddings = [];
    for (let j = 0; j < chunks.length; j++) {
      const emb = await getEmbedding(chunks[j]);
      embeddings.push(emb);
      // Small delay between requests to avoid bursts
      if (j < chunks.length - 1) await sleep(700);
    }

    // Save vector documents
    const docCreates = chunks.map((chunk, idx) => ({
      userId,
      content: chunk,
      embedding: embeddings[idx],
      metadata: {
        type: 'personal_doc',
        fileId: String(personalDoc._id),
        fileName: file.originalname,
        chunkIndex: idx,
        uploadedAt: new Date(),
      },
    }));

    await VectorDocument.insertMany(docCreates);
    return personalDoc;
  } catch (error) {
    // Clean up metadata if indexing fails
    await PersonalDocument.deleteOne({ _id: personalDoc._id });
    throw error;
  }
};

/**
 * Deletes a personal document and all its indexed vector chunks.
 */
const deletePersonalDocument = async (userId, fileId) => {
  await VectorDocument.deleteMany({
    userId,
    'metadata.type': 'personal_doc',
    'metadata.fileId': String(fileId),
  });
  await PersonalDocument.deleteOne({ _id: fileId, userId });
};

module.exports = {
  indexDocument,
  searchDocuments,
  searchPersonalDocuments,
  indexPersonalDocument,
  deletePersonalDocument,
  indexEmail,
  indexCalendarEvent,
  indexTask,
  indexChatMessage,
  buildRAGContext,
};
