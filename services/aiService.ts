
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
      You are a world-class screenwriter and dramatist.
      Your goal is to create a DEEP, COHERENT, and EMOTIONALLY GRIPPING script scenario.
      
      CORE GUIDELINES:
      1. **Causal Fluency**: Plot points must follow a logical cause-and-effect chain. Avoid random events. Event A must lead to Event B.
      2. **Character Contrast**: Characters must be foils to each other. They should have conflicting philosophies or goals to drive natural tension.
      3. **Vivid Setting**: The setting should interact with the plot, not just be a background.
      4. **Specific Voices**: Define specific speaking styles (e.g., "Short, punchy sentences", "Uses flowery metaphors", "Stutters when nervous").
      
      ${langInstruction}
    `;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: `Create a script scenario based on this idea: "${prompt}". Make it dramatic and fluid.`,
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
              description: "5 key chronological events representing the story arc"
            },
            possibleEndings: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "2 distinct emotional endings"
            },
            characters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  role: { type: Type.STRING },
                  personality: { type: Type.STRING, description: "Deep psychological traits & motivations" },
                  speakingStyle: { type: Type.STRING, description: "Distinct verbal tics, vocabulary level, or rhythm" },
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
      `### ${c.name} (${c.role})
       - Personality: ${c.personality}
       - Speaking Style (MUST MIMIC): ${c.speakingStyle}`
    ).join("\n");

    let promptContext = "";
    
    // CRITICAL: God Mode / Director Override Logic - Improved for Natural Flow
    if (forcedDirectorCommand) {
        promptContext = `
        🚨 **DIRECTOR INTERVENTION (GOD MODE)** 🚨
        The Director has injected a specific event or command: "${forcedDirectorCommand}".
        
        **CRITICAL INSTRUCTION**: 
        Do NOT just paste this event blindly. You must **weave it into the narrative flow**.
        1. If it's an action event, describe it vividly via the Narrator.
        2. If it's a character instruction, justify it internally (e.g., a sudden realization, a hidden motive revealed).
        3. The characters must react to this new reality *immediately* and *in-character*.
        
        Make it feel like a shocking plot twist or a natural evolution, not a glitch.
        `;
    } else {
        promptContext = `
        **NARRATIVE FLOW INSTRUCTIONS**:
        1. **Pacing**: Analyze the previous beat. If it was intense, maybe this beat is a reaction. If it was quiet, introduce tension.
        2. **Subtext**: Characters should rarely say exactly what they mean. Use subtext.
        3. **Plot Progression**: Gently nudge the story towards the next Plot Point: "${script.plotPoints.find(p => !historyText.includes(p)) || 'Climax'}".
        
        **CHARACTER STRICTNESS**:
        - You MUST strictly adhere to 'Speaking Style'. 
        - If a character is rude, they must NOT be polite.
        - If a character is shy, they might stutter or use fragments.
        - DO NOT sound like a generic AI assistant.
        `;
    }

    const prompt = `
      Title: ${script.title}
      Setting: ${script.setting}
      
      Characters & Profiles:
      ${characterProfiles}

      Recent Transcript:
      ${historyText}

      ${promptContext}

      Task: Generate the NEXT single beat (Dialogue, Action, or Narration).
      ${langInstruction}
      
      Return JSON:
      {
        "characterName": "Name or 'Narrator'",
        "type": "dialogue" | "action" | "narration",
        "content": "The text content. If dialogue, do not include the name prefix."
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
