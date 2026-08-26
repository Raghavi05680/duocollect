import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { customer_name, company_name, amount, currency, due_date, invoice_number, tone } = await req.json();

    const formattedAmount = `${currency || '₹'}${Number(amount || 0).toLocaleString('en-IN')}`;
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
You are an autonomous AI collections agent for DuoCollect.
Generate a payment reminder email with the following details:
- Debtor Name: ${customer_name || 'Client'}
- Company: ${company_name || 'Valued Business'}
- Invoice Number: ${invoice_number || 'INV-001'}
- Outstanding Amount: ${formattedAmount} (YOU MUST EXPLICITLY INCLUDE THIS EXACT AMOUNT IN THE BODY)
- Due Date: ${due_date || 'immediate'}
- Target Tone: ${tone || 'Polite'} (Options: Polite, Firm, Urgent)

Tone Guidelines:
- Polite: Friendly reminder, relationship-focused, mentioning standard payment terms.
- Firm: Professional, formal, highlighting overdue status and requesting immediate confirmation of payment date.
- Urgent: Strict notice, warning about account suspension, interest penalties, or escalation.

Rules:
1. DO NOT use placeholder brackets like [Amount] or [Invoice Number]. Insert the actual provided values: ${formattedAmount} and ${invoice_number}.
2. Provide your output in valid JSON format matching this exact schema:
{
  "subject": "Email subject line here",
  "body": "Complete email body text here with greeting, outstanding amount ${formattedAmount}, due date, and professional sign-off."
}

Return ONLY the raw JSON object, without Markdown code blocks (\`\`\`json).
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    
    // Clean any accidental markdown wrappers
    const cleanJson = text.replace(/^```json/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleanJson);

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Gemini Generation Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}