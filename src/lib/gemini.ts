import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || '';

if (!apiKey) {
  console.warn('GEMINI_API_KEY is not defined in .env.local');
}

export const ai = new GoogleGenAI({ apiKey });