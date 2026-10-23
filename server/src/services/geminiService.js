const { GoogleGenerativeAI } = require('@google/generative-ai');

const getApiKey = () => process.env.GEMINI_API_KEY || '';

const getGenerativeModel = (jsonOutput = false, systemInstruction = '') => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const config = {
    model: 'gemini-2.0-flash'
  };

  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }

  if (jsonOutput) {
    config.generationConfig = {
      responseMimeType: 'application/json',
      temperature: 0.2
    };
  }

  return genAI.getGenerativeModel(config);
};

/**
 * 1. parseVoiceExpense
 */
const parseVoiceExpense = async (transcript, language = 'hi') => {
  try {
    if (!transcript || typeof transcript !== 'string') {
      return { error: 'Transcript text is required' };
    }

    const systemInstruction = `You are helping Indian farmers record farm expenses from voice input in language ${language}.
Extract:
- category: one of [diesel_fuel, irrigation_water, seeds, fertilizers, pesticides, labour, tractor_machinery, land_preparation, sowing, harvesting, transport, packaging, repairs, other]
- amount: number in rupees (if not mentioned, null)
- description: brief summary in Hindi or English
- date: ISO date string (YYYY-MM-DD) if mentioned, else null
- crop: string if mentioned, else null
- quantity: number if mentioned, else null
- unit: string if mentioned (e.g. kg, quintal, bag, litre, hours, days), else null
- confidence: number between 0 and 1
- missingFields: array of strings naming missing key fields like ["amount", "category"]

Return JSON only conforming to:
{
  "category": string,
  "amount": number | null,
  "description": string,
  "date": string | null,
  "crop": string | null,
  "quantity": number | null,
  "unit": string | null,
  "confidence": number,
  "missingFields": string[]
}`;

    const model = getGenerativeModel(true, systemInstruction);
    const prompt = `Voice transcript: "${transcript}"`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    return parsed;
  } catch (err) {
    console.error('[GeminiService] parseVoiceExpense error:', err.message);
    return {
      error: err.message,
      category: 'other',
      amount: null,
      description: transcript,
      confidence: 0,
      missingFields: ['amount', 'category']
    };
  }
};

/**
 * 2. chat
 */
const chat = async (message, history = [], language = 'hi') => {
  try {
    if (!message || typeof message !== 'string') {
      return { error: 'Message is required' };
    }

    const systemInstruction = `You are Krishi Mitra, a helpful agricultural assistant for Indian farmers.
Answer in the farmer's language (${language}, Hindi/Hinglish preferred).
Provide practical advice on farming, crop diseases, government schemes, weather, and markets.
Be warm, simple, respectful, and accurate.
Never make up specific prices or government scheme amounts - say you'll need to verify those with local authorities or mandi updates.`;

    const model = getGenerativeModel(false, systemInstruction);

    // Format history if provided
    let contents = [];
    if (Array.isArray(history) && history.length > 0) {
      contents = history.map((h) => ({
        role: h.role === 'assistant' || h.role === 'model' ? 'model' : 'user',
        parts: [{ text: h.content || h.message || '' }]
      }));
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const result = await model.generateContent({ contents });
    const responseText = result.response.text();

    return { response: responseText };
  } catch (err) {
    console.error('[GeminiService] chat error:', err.message);
    return { error: err.message, response: 'माफ़ कीजिए, अभी सहायता उपलब्ध नहीं हो पा रही है। कृपया कुछ समय बाद पुनः प्रयास करें।' };
  }
};

/**
 * 3. cropRecommend
 */
const cropRecommend = async ({ soil, ph, npk, rainfall, season, state }) => {
  try {
    const systemInstruction = `You are an expert Indian agronomist. Recommend the best crops and varieties based on regional soil, climate, and agronomic parameters. Return strictly a JSON object:
{
  "recommendations": [
    {
      "crop": "string",
      "variety": "string",
      "reasons": "string",
      "expectedYield": "string",
      "season": "string"
    }
  ],
  "generalAdvice": "string"
}`;

    const model = getGenerativeModel(true, systemInstruction);
    const prompt = `Please provide crop recommendations for the following conditions:
- State / Region: ${state || 'Not specified'}
- Soil Type: ${soil || 'Not specified'}
- Soil pH: ${ph || 'Not specified'}
- NPK values: ${npk ? JSON.stringify(npk) : 'Not specified'}
- Rainfall: ${rainfall || 'Moderate'}
- Farming Season: ${season || 'Current / Kharif / Rabi'}`;

    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text());

    return parsed;
  } catch (err) {
    console.error('[GeminiService] cropRecommend error:', err.message);
    return {
      error: err.message,
      recommendations: [],
      generalAdvice: 'Unable to fetch crop recommendations at this moment.'
    };
  }
};

/**
 * 4. identifyDisease
 */
const identifyDisease = async ({ description, imageDescription }) => {
  try {
    const systemInstruction = `You are a plant pathologist and crop disease specialist for Indian agriculture.
Given disease symptoms and descriptions, diagnose the potential disease, suggest treatments (organic and chemical), preventive steps, and urgency.
Return strictly a JSON object:
{
  "disease": "string",
  "confidence": number,
  "symptoms": ["string"],
  "treatment": {
    "organic": ["string"],
    "chemical": ["string"]
  },
  "preventiveMeasures": ["string"],
  "urgency": "low" | "medium" | "high" | "critical"
}`;

    const model = getGenerativeModel(true, systemInstruction);
    const prompt = `Diagnose crop condition based on symptoms:
Description: ${description || 'Not provided'}
Visual / Image Observation: ${imageDescription || 'Not provided'}`;

    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text());

    return parsed;
  } catch (err) {
    console.error('[GeminiService] identifyDisease error:', err.message);
    return {
      error: err.message,
      disease: 'Unknown Condition',
      confidence: 0,
      symptoms: [],
      treatment: { organic: [], chemical: [] },
      preventiveMeasures: [],
      urgency: 'medium'
    };
  }
};

module.exports = {
  parseVoiceExpense,
  chat,
  cropRecommend,
  identifyDisease
};
