
import { GoogleGenAI, Type } from "@google/genai";
import { Script, Character, Message, Language, AppSettings } from "../types";

const TEXT_MODEL = 'gemini-2.5-flash';
const IMAGE_MODEL = 'gemini-2.5-flash-image';

// --- Helper to get Client ---
const getClient = (settings?: AppSettings) => {
    const apiKey = settings?.apiKey || process.env.API_KEY;
    if (!apiKey) throw new Error("API Key is missing. Please configure it in Settings.");
    
    // Note: The @google/genai SDK constructor options are strict. 
    // If a baseUrl is needed (for proxies), it often needs to be handled via custom fetch or specific SDK options if supported.
    // For this implementation, we stick to standard initialization but allow the key to be dynamic.
    return new GoogleGenAI({ apiKey });
};

// --- Retry Helper ---
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(fn: () => Promise<T>, retries = 3, baseDelay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = 
      error?.status === 429 || 
      error?.code === 429 || 
      error?.message?.includes('429') || 
      error?.message?.includes('quota') ||
      error?.toString().includes('429');

    if (isRateLimit && retries > 0) {
      console.warn(`Rate limit hit. Retrying in ${baseDelay}ms... (${retries} attempts left)`);
      await wait(baseDelay);
      return withRetry(fn, retries - 1, baseDelay * 2);
    }
    throw error;
  }
}

/**
 * Generates the initial script structure (Title, Premise, Characters) from a user prompt.
 */
export const generateScriptBlueprint = async (prompt: string, lang: Language = 'zh-CN', settings?: AppSettings): Promise<Partial<Script>> => {
  return withRetry(async () => {
    const ai = getClient(settings);
    const langInstruction = lang === 'zh-CN' ? "Respond entirely in Simplified Chinese." : "Respond in English.";
    
    const systemInstruction = `
      You are a master storyteller, dramatist, and screenwriter.
      Your goal is to create DEEP, COMPLEX, and EMOTIONALLY RESONANT narratives.
      Avoid clichés. Avoid shallow characters.
      
      Task: Expand the user's idea into a rich dramatic setup.
      1. Title: Creative and evocative.
      2. Premise: High stakes, clear conflict, interesting hook.
      3. Setting: Atmospheric and specific.
      4. Plot Points: Provide 3 twists or major events that escalate tension.
      5. Characters: Create 2-5 characters with conflicting goals, hidden secrets, or strong chemistry.
      
      ${langInstruction}
    `;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: `Create a script scenario based on this idea: "${prompt}"`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            premise: { type: Type.STRING },
            setting: { type: Type.STRING, description: "Where the scene takes place" },
            plotPoints: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "3 key events that should happen, including twists"
            },
            possibleEndings: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "2 distinct ways the story could end (Tragedy/Comedy/Open)"
            },
            characters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  role: { type: Type.STRING, description: "Their job or archetype, e.g. Commander, Spy" },
                  personality: { type: Type.STRING, description: "Complex traits, inner motivations, flaws" },
                  speakingStyle: { type: Type.STRING, description: "Distinct voice. e.g. 'Formal and cold', 'Uses lot of slang', 'Stutters when nervous'" },
                  visualDescription: { type: Type.STRING, description: "Detailed physical appearance for image generation" },
                },
                required: ["name", "role", "personality", "speakingStyle", "visualDescription"]
              }
            }
          },
          required: ["title", "premise", "setting", "characters", "plotPoints", "possibleEndings"]
        }
      }
    });

    if (!response.text) throw new Error("Failed to generate script blueprint");
    
    const data = JSON.parse(response.text);
    
    // Transform to our internal type
    return {
      title: data.title,
      premise: data.premise,
      setting: data.setting,
      plotPoints: data.plotPoints || [],
      possibleEndings: data.possibleEndings || [],
      characters: data.characters.map((c: any) => ({
        id: crypto.randomUUID(),
        name: c.name,
        role: c.role,
        personality: c.personality,
        speakingStyle: c.speakingStyle || "Neutral",
        visualDescription: c.visualDescription,
        isUserControlled: false,
      })),
      history: [],
      lastUpdated: Date.now()
    };
  });
};

/**
 * Refines or autocompletes text based on context.
 */
export const refineText = async (
  currentText: string, 
  fieldType: string, 
  scriptContext: Script, 
  lang: Language = 'zh-CN',
  settings?: AppSettings
): Promise<string> => {
  return withRetry(async () => {
    const ai = getClient(settings);
    const langInstruction = lang === 'zh-CN' ? "Respond in Simplified Chinese." : "Respond in English.";
    
    const prompt = `
      Context:
      Script Title: ${scriptContext.title}
      Premise: ${scriptContext.premise}
      
      Task:
      The user is writing the field: "${fieldType}".
      Current text content: "${currentText}"

      If the text is empty, generate a creative suggestion suitable for this script.
      If the text is partial, complete it.
      If the text is complete but short, expand and improve it to be more dramatic and professional.
      
      ${langInstruction}
      Return ONLY the refined text, no explanations.
    `;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt
    });

    return response.text?.trim() || currentText;
  });
};

/**
 * Determines the next turn in the story.
 */
export const generateNextBeat = async (
    script: Script, 
    forcedDirectorCommand: string | null,
    lang: Language = 'zh-CN',
    settings?: AppSettings
): Promise<{ characterId: string; content: string; type: 'dialogue' | 'action' | 'narration' }> => {
  return withRetry(async () => {
    const ai = getClient(settings);
    const langInstruction = lang === 'zh-CN' ? "Respond in Simplified Chinese." : "Respond in English.";
    
    // Last 15 messages to capture enough context including director notes
    const recentHistory = script.history.slice(-15);
    const historyText = recentHistory.map(m => {
      const charName = script.characters.find(c => c.id === m.characterId)?.name || "Narrator/Director";
      return `${charName} [${m.type.toUpperCase()}]: ${m.content}`;
    }).join("\n");

    const characterProfiles = script.characters.map(c => 
      `- Name: ${c.name} (${c.role})\n  Personality: ${c.personality}\n  Speaking Style: ${c.speakingStyle}`
    ).join("\n\n");

    let promptContext = "";
    
    if (forcedDirectorCommand) {
        promptContext = `
        IMPORTANT: The Director (User/God) has just issued a SPECIFIC COMMAND: "${forcedDirectorCommand}".
        
        Your ONLY task is to make the characters or world react to this command immediately.
        Do not ignore it. Do not continue previous conversations.
        If the command describes an event (e.g. "It rains"), describe the rain (Narration) or have a character react to the rain.
        If the command changes the plot, pivot the story instantly.
        `;
    } else {
        promptContext = `
        Continue the story naturally.
        Maintain tension and character voice.
        `;
    }

    const prompt = `
      Current Setting: ${script.setting}
      Premise: ${script.premise}
      Key Plot Points: ${script.plotPoints?.join("; ")}
      
      Character Profiles:
      ${characterProfiles}

      Recent Transcript:
      ${historyText}

      ${promptContext}

      Task:
      Generate the next single beat of the story. 
      1. Choose which character speaks or acts next. 
      2. Provide their dialogue or action.
      3. Mimic the character's "Speaking Style" perfectly.
      4. If the scene needs direction, description, or time passing, use "Narrator".
      
      ${langInstruction}
      Return JSON.
    `;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            characterName: { type: Type.STRING, description: "Exact name of the character, or 'Narrator'" },
            type: { type: Type.STRING, enum: ["dialogue", "action", "narration"] },
            content: { type: Type.STRING }
          },
          required: ["characterName", "type", "content"]
        }
      }
    });

    if (!response.text) throw new Error("Failed to generate beat");
    const data = JSON.parse(response.text);

    // Map back to ID
    let charId = 'narrator';
    if (data.characterName !== 'Narrator') {
      const char = script.characters.find(c => c.name === data.characterName);
      if (char) charId = char.id;
    }

    return {
      characterId: charId,
      content: data.content,
      type: data.type as any
    };
  });
};

/**
 * Generates an avatar image for a character.
 */
export const generateAvatarImage = async (character: Character, settings?: AppSettings, style: string = "cinematic, detailed portrait"): Promise<string> => {
  return withRetry(async () => {
    const ai = getClient(settings);
    const prompt = `${style} of ${character.visualDescription}, character named ${character.name}, ${character.role}. High quality, 4k, photorealistic style.`;
    
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: {
        parts: [
          { text: prompt }
        ]
      }
    });

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) throw new Error("No image generated");

    const parts = candidates[0].content?.parts;
    if (!parts) throw new Error("No content parts in response");

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("Unexpected response format for image generation");
  });
};

/**
 * Generates a scene illustration based on narration text.
 */
export const generateSceneImage = async (sceneDescription: string, scriptTitle: string, settings?: AppSettings): Promise<string> => {
  return withRetry(async () => {
    const ai = getClient(settings);
    // Truncate if too long to save tokens
    const desc = sceneDescription.length > 300 ? sceneDescription.substring(0, 300) : sceneDescription;
    const prompt = `Cinematic movie still, wide shot. Context: ${scriptTitle}. Scene description: ${desc}. Highly detailed, 4k, atmospheric lighting, movie aesthetics.`;

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: {
        parts: [
          { text: prompt }
        ]
      }
    });

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) throw new Error("No image generated");

    const parts = candidates[0].content?.parts;
    if (!parts) throw new Error("No content parts in response");

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data found");
  });
};