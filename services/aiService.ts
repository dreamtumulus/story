
import { GoogleGenAI, Type } from "@google/genai";
import { Script, Character, Message, Language, AppSettings } from "../types";

const TEXT_MODEL = 'gemini-2.5-flash';
const IMAGE_MODEL = 'gemini-2.5-flash-image';

// --- Helper to get Client ---
const getClient = (settings?: AppSettings) => {
    // Prioritize User API Key -> Then Process Env
    const apiKey = settings?.apiKey || process.env.API_KEY;
    if (!apiKey) throw new Error("No API Key");
    
    return new GoogleGenAI({ apiKey });
};

// --- Retry Helper ---
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(fn: () => Promise<T>, retries = 2, baseDelay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = 
      error?.status === 429 || 
      error?.code === 429 || 
      error?.message?.includes('429') || 
      error?.message?.includes('quota');

    if (isRateLimit && retries > 0) {
      console.warn(`Rate limit hit. Retrying in ${baseDelay}ms...`);
      await wait(baseDelay);
      return withRetry(fn, retries - 1, baseDelay * 2);
    }
    throw error;
  }
}

/**
 * Generates the initial script structure with richer plots.
 */
export const generateScriptBlueprint = async (prompt: string, lang: Language = 'zh-CN', settings?: AppSettings): Promise<Partial<Script>> => {
  return withRetry(async () => {
    const ai = getClient(settings);
    const langInstruction = lang === 'zh-CN' ? "Respond entirely in Simplified Chinese." : "Respond in English.";
    
    const systemInstruction = `
      You are a master storyteller, dramatist, and screenwriter.
      Your goal is to create DEEP, COMPLEX, and EMOTIONALLY RESONANT narratives.
      
      Instructions:
      1. Create high stakes and strong conflict.
      2. Ensure characters have secrets and conflicting goals.
      3. Plot points must be dramatic twists, not just events.
      
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
            setting: { type: Type.STRING, description: "Detailed visual setting" },
            plotPoints: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "3-5 key events including a major twist"
            },
            possibleEndings: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "2 distinct endings"
            },
            characters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  role: { type: Type.STRING },
                  personality: { type: Type.STRING, description: "Complex traits & motivations" },
                  speakingStyle: { type: Type.STRING, description: "Distinct voice patterns" },
                  visualDescription: { type: Type.STRING, description: "Detailed physical appearance" },
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
 * Refines text.
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
      Context: ${scriptContext.title}. ${scriptContext.premise}
      Task: Improve the following "${fieldType}" text. Make it more dramatic, concise, and evocative.
      Text: "${currentText}"
      ${langInstruction}
      Return ONLY the refined text.
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
    
    // Context window
    const recentHistory = script.history.slice(-20);
    const historyText = recentHistory.map(m => {
      const charName = script.characters.find(c => c.id === m.characterId)?.name || "Narrator";
      return `${charName} [${m.type.toUpperCase()}]: ${m.content}`;
    }).join("\n");

    const characterProfiles = script.characters.map(c => 
      `- ${c.name} (${c.role}): ${c.personality}. Style: ${c.speakingStyle}`
    ).join("\n");

    let promptContext = "";
    
    // CRITICAL: God Mode / Director Override Logic
    if (forcedDirectorCommand) {
        promptContext = `
        🚨 URGENT DIRECTOR OVERRIDE 🚨
        The Director (User) has issued a command: "${forcedDirectorCommand}".
        
        YOU MUST EXECUTE THIS COMMAND IMMEDIATELY in this turn.
        - If it's an event (e.g. "An explosion happens"), use 'Narrator' to describe it vividly.
        - If it's a character instruction (e.g. "John gets angry"), have John speak or act angrily.
        - IGNORE previous conversation flow if necessary to satisfy the command.
        `;
    } else {
        promptContext = `
        Continue the story naturally. 
        Focus on conflict, emotion, and character chemistry. 
        Keep dialogue sharp. Avoid repetitive greetings.
        If the scene is stale, introduce a minor twist from the plot points.
        `;
    }

    const prompt = `
      Title: ${script.title}
      Setting: ${script.setting}
      Plot Points: ${script.plotPoints?.join("; ")}
      
      Characters:
      ${characterProfiles}

      Transcript:
      ${historyText}

      ${promptContext}

      Task: Generate the next beat.
      ${langInstruction}
      
      Return JSON:
      {
        "characterName": "Name or 'Narrator'",
        "type": "dialogue" | "action" | "narration",
        "content": "The text"
      }
    `;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            characterName: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["dialogue", "action", "narration"] },
            content: { type: Type.STRING }
          },
          required: ["characterName", "type", "content"]
        }
      }
    });

    if (!response.text) throw new Error("Failed to generate beat");
    const data = JSON.parse(response.text);

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
 * Generates an avatar.
 */
export const generateAvatarImage = async (character: Character, settings?: AppSettings): Promise<string> => {
  return withRetry(async () => {
    const ai = getClient(settings);
    const prompt = `Cinematic portrait of ${character.name}, ${character.role}. ${character.visualDescription}. High detail, 8k, dramatic lighting.`;
    
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: { parts: [{ text: prompt }] }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) throw new Error("No image generated");

    for (const part of parts) {
      if (part.inlineData?.data) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data found");
  });
};

/**
 * Generates a scene illustration.
 */
export const generateSceneImage = async (sceneDescription: string, scriptTitle: string, settings?: AppSettings): Promise<string> => {
  return withRetry(async () => {
    const ai = getClient(settings);
    const desc = sceneDescription.length > 400 ? sceneDescription.substring(0, 400) : sceneDescription;
    const prompt = `Movie concept art, wide shot. Story: ${scriptTitle}. Scene: ${desc}. Masterpiece, 4k, atmospheric, detailed.`;

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: { parts: [{ text: prompt }] }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) throw new Error("No image generated");

    for (const part of parts) {
      if (part.inlineData?.data) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data found");
  });
};
