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
 * Converts text into a 768-dimension vector embedding using Gemini text-embedding-004.
 */
const getEmbedding = async (text) => {
  try {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text.slice(0, 8000));
    return result.embedding.values;
  } catch (error) {
    console.error('[RAG] Failed to get embedding from Gemini:', error.message);
    throw error;
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
 * Searches user's indexed documents using cosine similarity.
 */
const searchDocuments = async (userId, query, k = 4) => {
  if (!query || !query.trim()) return [];
  try {
    const queryEmbedding = await getEmbedding(query);
    const docs = await VectorDocument.find({ userId }).lean();
    if (docs.length === 0) return [];

    const scoredDocs = docs.map((doc) => {
      const score = cosineSimilarity(queryEmbedding, doc.embedding);
      return {
        content: doc.content,
        score,
        metadata: doc.metadata,
      };
    });

    // Sort by score descending
    scoredDocs.sort((a, b) => b.score - a.score);

    // Return top k results with score > 0.65 (relevance threshold)
    return scoredDocs.filter((d) => d.score > 0.65).slice(0, k);
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
    if (docs.length === 0) return [];

    const scoredDocs = docs.map((doc) => {
      const score = cosineSimilarity(queryEmbedding, doc.embedding);
      return {
        content: doc.content,
        score,
        metadata: doc.metadata,
      };
    });

    // Sort by score descending
    scoredDocs.sort((a, b) => b.score - a.score);

    // Return top k results with score > 0.60
    return scoredDocs.filter((d) => d.score > 0.60).slice(0, k);
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
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(file.buffer);
    text = data.text;
  } else {
    // Treat as plain text
    text = file.buffer.toString('utf-8');
  }

  if (!text || !text.trim()) {
    throw new Error('Document has no extractable text content.');
  }

  // Chunk text: 800 chars chunk size, 150 overlap
  const chunkSize = 800;
  const overlap = 150;
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }

  if (chunks.length === 0) {
    throw new Error('No text chunks generated.');
  }

  // Create PersonalDocument metadata record first
  const personalDoc = await PersonalDocument.create({
    userId,
    fileName: file.originalname,
    fileSize: file.size,
    mimeType: file.mimetype,
    chunkCount: chunks.length,
  });

  try {
    // Generate embeddings in batch
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    
    // Batch embed contents using the array of chunks
    const result = await model.batchEmbedContents({
      requests: chunks.map((chunk) => ({
        content: { parts: [{ text: chunk }] },
        model: 'models/text-embedding-004',
      })),
    });

    const embeddings = result.embeddings.map((e) => e.values);

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
