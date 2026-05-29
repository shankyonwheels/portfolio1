import { GoogleGenAI } from '@google/genai';
import { SYSTEM_PROMPT } from '../src/lib/profileKnowledge.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { message, history } = req.body;
    
    if (!message || typeof message !== 'string' || message.length > 500) {
       return res.status(400).json({ error: 'Invalid message' });
    }

    const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY
    });
    
    const formattedHistory = history ? history.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    })) : [];

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
      contents: [
        ...formattedHistory,
        {
          role: 'user',
          parts: [{ text: message }]
        }
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT
      }
    });

    return res.status(200).json({ answer: response.text });
  } catch (error) {
    console.error('Chat API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
