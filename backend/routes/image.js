const express = require('express');
const router = express.Router();
const axios = require('axios');
const authMiddleware = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// All image routes require authentication
router.use(authMiddleware);

/**
 * POST /api/image/generate
 * Generates an image by proxying to Pollinations AI.
 * Optionally enhances the user prompt with Gemini before sending.
 */
router.post('/generate', async (req, res) => {
    try {
        const {
            prompt,
            width = 1024,
            height = 1024,
            model = 'flux',       // flux | turbo | flux-realism | flux-anime | flux-3d
            style = '',           // optional style prefix
            enhance = true,       // whether to use Gemini to enhance the prompt
            nologo = true,
            seed,
        } = req.body;

        if (!prompt || !prompt.trim()) {
            return res.status(400).json({ success: false, message: 'Prompt is required.' });
        }

        let finalPrompt = prompt.trim();

        // ── Optional Gemini prompt enhancement ───────────────────────────
        if (enhance) {
            try {
                const apiKey = process.env.GEMINI_API_KEY;
                if (apiKey && apiKey !== 'your_gemini_api_key_here') {
                    const genAI = new GoogleGenerativeAI(apiKey);
                    const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

                    const enhanceInstruction = `You are an expert AI image prompt engineer. Your job is to take a basic image idea and rewrite it as a highly detailed, vivid, and visually specific prompt for an AI image generator (like Stable Diffusion / FLUX).

Rules:
- Add specific visual details: lighting, composition, color palette, texture, mood, art style
- Keep it under 200 words
- Output ONLY the enhanced prompt text, nothing else. No explanations, no quotes.
- If you see a style hint like "${style}", weave it into the prompt naturally.

User's idea: "${finalPrompt}"`;

                    const result = await geminiModel.generateContent(enhanceInstruction);
                    const enhanced = result.response.text().trim();
                    if (enhanced && enhanced.length > 10) {
                        finalPrompt = enhanced;
                    }
                }
            } catch (enhanceErr) {
                console.warn('[Image] Gemini prompt enhancement failed, using raw prompt:', enhanceErr.message);
            }
        }

        // Prepend style if provided and not already in prompt
        if (style && !finalPrompt.toLowerCase().includes(style.toLowerCase())) {
            finalPrompt = `${style}, ${finalPrompt}`;
        }

        // ── Build Pollinations URL ────────────────────────────────────────
        const encodedPrompt = encodeURIComponent(finalPrompt);
        const params = new URLSearchParams({
            width: String(width),
            height: String(height),
            nologo: nologo ? 'true' : 'false',
            model,
        });
        if (seed !== undefined && seed !== null) params.set('seed', String(seed));

        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`;

        // ── Fetch image from Pollinations and stream it back ─────────────
        const imageRes = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 90000,
            headers: { 'User-Agent': 'TOM.AI/1.0' },
        });

        const contentType = imageRes.headers['content-type'] || 'image/jpeg';
        res.setHeader('Content-Type', contentType);
        res.setHeader('X-Enhanced-Prompt', Buffer.from(finalPrompt).toString('base64'));
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(Buffer.from(imageRes.data));

    } catch (error) {
        console.error('[Image] Generation error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Image generation failed. Please try again.',
            error: error.message,
        });
    }
});

/**
 * GET /api/image/models
 * Returns available image generation models / styles.
 */
router.get('/models', (_req, res) => {
    res.json({
        success: true,
        data: {
            models: [
                { id: 'flux', name: 'FLUX', desc: 'Best quality, photorealistic', color: '#7c6cfc' },
                { id: 'flux-realism', name: 'FLUX Realism', desc: 'Ultra-realistic photography', color: '#38bdf8' },
                { id: 'flux-anime', name: 'FLUX Anime', desc: 'Japanese anime & illustration', color: '#f472b6' },
                { id: 'flux-3d', name: 'FLUX 3D', desc: 'Cinematic 3D renders', color: '#34d399' },
                { id: 'turbo', name: 'Turbo', desc: 'Fast generation, great quality', color: '#fbbf24' },
            ],
            styles: [
                { id: '', label: 'Default' },
                { id: 'photorealistic', label: 'Photorealistic' },
                { id: 'digital art', label: 'Digital Art' },
                { id: 'oil painting', label: 'Oil Painting' },
                { id: 'watercolor', label: 'Watercolor' },
                { id: 'anime', label: 'Anime' },
                { id: 'cinematic', label: 'Cinematic' },
                { id: 'concept art', label: 'Concept Art' },
                { id: 'pixel art', label: 'Pixel Art' },
                { id: 'sketch', label: 'Sketch' },
                { id: 'neon cyberpunk', label: 'Cyberpunk' },
                { id: 'fantasy illustration', label: 'Fantasy' },
            ],
            aspectRatios: [
                { id: '1:1', label: 'Square', width: 1024, height: 1024 },
                { id: '16:9', label: 'Landscape', width: 1344, height: 768 },
                { id: '9:16', label: 'Portrait', width: 768, height: 1344 },
                { id: '4:3', label: '4:3', width: 1152, height: 864 },
                { id: '3:4', label: '3:4', width: 864, height: 1152 },
            ],
        }
    });
});

module.exports = router;
