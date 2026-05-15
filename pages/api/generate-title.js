// API route for generating template titles using Gemini AI
// This runs server-side to keep the API key secure

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { text } = req.body;

    if (!text || text.trim().length === 0) {
        return res.status(400).json({ error: 'No text provided' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured in .env.local' });
    }

    try {
        // Use first ~3000 chars to stay within limits and keep it fast
        const truncatedText = text.substring(0, 3000);

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `أنت مصنف مستندات قانونية عراقية. أعطني عنوان قصير ووصفي بالعربية (بحد أقصى 8 كلمات) لهذا المستند القانوني. أعد العنوان فقط بدون أي شرح أو ترقيم أو علامات ترقيم إضافية.

محتوى المستند:
${truncatedText}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: 50,
                    }
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Gemini API error:', errorData);
            return res.status(500).json({ error: 'Failed to generate title from AI' });
        }

        const data = await response.json();
        const generatedTitle = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (!generatedTitle) {
            return res.status(500).json({ error: 'No title generated' });
        }

        return res.status(200).json({ title: generatedTitle });
    } catch (error) {
        console.error('Generate title error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
