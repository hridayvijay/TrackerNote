import { Request, Response } from 'express';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenAI } from '@google/genai';

if (!getApps().length) {
  const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountStr) {
    try {
      const serviceAccount = JSON.parse(serviceAccountStr);
      initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON", e);
    }
  }
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return res.status(500).json({ error: 'FIREBASE_SERVICE_ACCOUNT_JSON is not configured' });
  }

  const { uid, audioBase64, mimeType, displayName } = req.body;

  if (!uid || !audioBase64 || !mimeType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const db = getFirestore();
    const settingsRef = db.collection('users').doc(uid).collection('settings').doc('integrations');
    const settingsDoc = await settingsRef.get();

    if (!settingsDoc.exists || !settingsDoc.data()?.geminiApiKey) {
      return res.status(400).json({ error: 'No Gemini API key configured for this user.' });
    }

    const geminiApiKey = settingsDoc.data()?.geminiApiKey;

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    const now = new Date();
    // Server is in UTC. Convert to IST (UTC+5:30)
    const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const dayOfWeek = istTime.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    const formattedDate = istTime.toISOString().split('T')[0];
    const todayContext = `Today is ${dayOfWeek}, ${formattedDate}.`;
    
    let displayNameContext = "";
    if (displayName) {
      displayNameContext = `The person speaking is named ${displayName}. When they use first-person pronouns (I, me, my, myself, I've, I'll, I need to, I have to), replace them in the generated noteContent with the person's name in third person. For example: 'I have to call Ritu' becomes '${displayName} has to call Ritu.' Only noteContent uses this substitution — do not apply it to any other JSON fields. `;
    }

    const systemInstruction = `${displayNameContext}${todayContext} You are a task parser. The user will speak a task description. Extract and return ONLY a valid JSON object with these exact fields: stakeholder (the main person responsible — strip all honorifics like Sir, Maam, Ma'am, Mr, Mrs, Dr, Miss and normalize to Title Case), project (the topic or work item), noteContent (full context of what needs doing, written as a clear task statement), reminderText (short action phrase max 6 words starting with a verb), timesPerDay (number, how many reminders per day, default 1 if not mentioned), daysOfWeek (array of day name strings if specific days mentioned, empty array means every day), dueDate (ISO 8601 datetime string), priority (High Medium or Low inferred from urgency language), status (always the string Pending). You will be told today's exact date and day of the week as system context, separate from anything the user said. The user will never mention today's date themselves. When the user mentions any relative date or time reference, resolve it into an actual ISO 8601 datetime using the provided today's-date as the reference point. Populate the dueDate field with the resolved ISO 8601 datetime string. Never leave dueDate null or undefined — if no specific date is mentioned, use tomorrow's date at 9:00 AM IST as a default. If multiple days are mentioned for a recurring task, populate daysOfWeek with the actual day names resolved from context, not relative phrases. Never return a relative phrase like 'next week' as a literal string in the JSON — always resolve it to a real date. Do not include the resolved due date or reminder time inside the noteContent field. Those go in dueDate and reminder fields only. noteContent should describe the task without mentioning specific dates. If Gemini embedded a date as plain text inside noteContent, strip it out of noteContent during parsing on the server before returning the JSON. Return nothing except the raw JSON object. No markdown. No explanation.`;

    const contents = [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              data: audioBase64,
              mimeType: mimeType,
            },
          },
        ],
      },
    ];

    let responseJsonStr = '';

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents,
        config: { systemInstruction },
      });

      responseJsonStr = response.text || '';
    } catch (genErr: any) {
      console.error("Gemini API error", genErr.message || genErr);
      return res.status(502).json({ error: 'Gemini API failure' });
    }

    // Try to parse the first response
    let parsedJson = null;
    try {
      // Basic cleanup in case of markdown wrap
      let cleanStr = responseJsonStr.trim();
      if (cleanStr.startsWith('```json')) {
        cleanStr = cleanStr.substring(7);
      } else if (cleanStr.startsWith('```')) {
        cleanStr = cleanStr.substring(3);
      }
      if (cleanStr.endsWith('```')) {
        cleanStr = cleanStr.substring(0, cleanStr.length - 3);
      }
      parsedJson = JSON.parse(cleanStr);
    } catch (parseErr) {
      // Retry once if parsing fails
      try {
        const retryContents = [
          ...contents,
          { role: 'model', parts: [{ text: responseJsonStr }] },
          { role: 'user', parts: [{ text: 'That was not valid JSON. Please return ONLY the raw JSON object without any markdown wrapping or other text.' }] }
        ];

        const retryResponse = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: retryContents,
          config: { systemInstruction },
        });

        const retryStr = retryResponse.text || '';
        let cleanRetryStr = retryStr.trim();
        if (cleanRetryStr.startsWith('```json')) {
            cleanRetryStr = cleanRetryStr.substring(7);
        } else if (cleanRetryStr.startsWith('```')) {
            cleanRetryStr = cleanRetryStr.substring(3);
        }
        if (cleanRetryStr.endsWith('```')) {
            cleanRetryStr = cleanRetryStr.substring(0, cleanRetryStr.length - 3);
        }
        parsedJson = JSON.parse(cleanRetryStr);
      } catch (retryErr) {
        return res.status(422).json({ error: 'Failed to parse Gemini response into JSON' });
      }
    }

    return res.status(200).json(parsedJson);
  } catch (error) {
    console.error("Error processing request", error);
    return res.status(502).json({ error: 'Internal server error' });
  }
}
