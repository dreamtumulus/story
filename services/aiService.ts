
import { GoogleGenAI, Type } from "@google/genai";
import { Script, Character, Message, Language, AppSettings } from "../types";

const TEXT_MODEL = 'gemini-2.5-flash';
const IMAGE_MODEL = 'gemini-2.5-flash-image';
const DEFAULT_GEMINI_KEY = 'AIzaSyC6zQSEAAdLRgOMR6_CwQ1sSNVur0_vpW0';

// --- Helper to get Effective Gemini Key ---
const getGeminiKey = (settings?: AppSettings) => {
    return settings?.apiKey || process.env.API_KEY || DEFAULT_GEMINI_KEY;
};

// --- Helper to get Client (Gemini) ---
const getClient = (settings?: AppSettings) => {
    const apiKey = getGeminiKey(settings);
    if (!apiKey) throw new Error("No API Key");
    return new GoogleGenAI({ apiKey });
};

// --- OpenRouter Fetch Helper ---
async function callOpenRouter(
    settings: AppSettings | undefined,
    messages: { role: string, content: string }[],
    jsonMode = false
): Promise<any> {
    const key = settings?.openRouterKey;
    if (!key) throw new Error("OpenRouter API Key missing");
    
    const model = settings?.openRouterModel || 'google/gemini-2.0-flash-lite-preview-02-05:free';
    
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${key}`,
            "Content-Type": "application/json",
            "HTTP-Referer": window.location.origin,
            "X-Title": "Daydreaming App"
        },
        body: JSON.stringify({
            model: model,
            messages: messages,
            response_format: jsonMode ? { type: "json_object" } : undefined
        })
    });

    if (!response.ok) {
        throw new Error(`OpenRouter Error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    return jsonMode ? safeJsonParse(content, {}) : content;
}

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
 * Robust JSON Parser to prevent crashes (Black Screen Fix)
 */
const safeJsonParse = <T>(text: string, fallback: T): T => {
  if (!text) return fallback;
  try {
    let clean = text.trim();
    // Remove markdown code blocks
    clean = clean.replace(/```json/g, '').replace(/```/g, '');
    // Remove potential leading/trailing garbage
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        clean = clean.substring(firstBrace, lastBrace + 1);
    }
    return JSON.parse(clean);
  } catch (e) {
    console.error("JSON Parse Failed:", e, "Text was:", text);
    return fallback;
  }
};

/**
 * Generates the initial script structure with richer plots.
 */
export const generateScriptBlueprint = async (prompt: string, lang: Language = 'zh-CN', settings?: AppSettings): Promise<Partial<Script>> => {
  return withRetry(async () => {
    const langInstruction = lang === 'zh-CN' ? "Respond entirely in Simplified Chinese." : "Respond in English.";
    const systemInstruction = `
      You are a world-class screenwriter.
      Create a detailed script scenario.
      1. Plot Points must be sequential and causal.
      2. Characters must have conflicting goals.
      ${langInstruction}
    `;

    // Strategy Pattern: Check Provider
    if (settings?.activeProvider === 'OPENROUTER') {
        const jsonSchemaDesc = `
        Return valid JSON with this structure:
        {
            "title": "string",
            "premise": "string",
            "setting": "string",
            "plotPoints": ["string"],
            "possibleEndings": ["string"],
            "characters": [{ "name": "string", "role": "string", "personality": "string", "speakingStyle": "string", "visualDescription": "string" }]
        }
        `;
        const data = await callOpenRouter(settings, [
            { role: "system", content: systemInstruction + jsonSchemaDesc },
            { role: "user", content: `Create a script scenario based on: "${prompt}".` }
        ], true);
        
        return processScriptData(data, prompt);
    }

    // Default: Gemini
    const ai = getClient(settings);
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: `Create a script scenario based on: "${prompt}".`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            premise: { type: Type.STRING },
            setting: { type: Type.STRING },
            plotPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            possibleEndings: { type: Type.ARRAY, items: { type: Type.STRING } },
            characters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  role: { type: Type.STRING },
                  personality: { type: Type.STRING },
                  speakingStyle: { type: Type.STRING },
                  visualDescription: { type: Type.STRING },
                },
                required: ["name", "role", "personality", "speakingStyle", "visualDescription"]
              }
            }
          }
        }
      }
    });

    const data = safeJsonParse(response.text || "{}", {});
    return processScriptData(data, prompt);
  });
};

// Helper to normalize script data from any provider
const processScriptData = (data: any, originalPrompt: string) => {
    return {
      title: data.title || "Untitled",
      premise: data.premise || originalPrompt,
      setting: data.setting || "",
      plotPoints: Array.isArray(data.plotPoints) ? data.plotPoints : [],
      possibleEndings: Array.isArray(data.possibleEndings) ? data.possibleEndings : [],
      characters: (data.characters || []).map((c: any) => ({
        id: crypto.randomUUID(),
        name: c.name || "Unknown",
        role: c.role || "Extra",
        personality: c.personality || "Neutral",
        speakingStyle: c.speakingStyle || "Normal",
        visualDescription: c.visualDescription || "A person",
        isUserControlled: false,
      })),
      history: [],
      lastUpdated: Date.now()
    };
};

/**
 * Generates a single new character that fits the script.
 */
export const generateSingleCharacter = async (script: Script, settings?: AppSettings): Promise<Character> => {
    return withRetry(async () => {
        const promptText = `
            Context: ${script.title}. ${script.premise}.
            Existing Characters: ${script.characters.map(c => c.name).join(', ')}.
            Task: Create ONE new unique character that adds conflict or comedy to this group.
            Return JSON only with keys: name, role, personality, speakingStyle, visualDescription.
        `;

        let data;
        if (settings?.activeProvider === 'OPENROUTER') {
            data = await callOpenRouter(settings, [{ role: "user", content: promptText }], true);
        } else {
            const ai = getClient(settings);
            const response = await ai.models.generateContent({
                model: TEXT_MODEL,
                contents: promptText,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            role: { type: Type.STRING },
                            personality: { type: Type.STRING },
                            speakingStyle: { type: Type.STRING },
                            visualDescription: { type: Type.STRING }
                        }
                    }
                }
            });
            data = safeJsonParse(response.text || "{}", {});
        }

        const fallback = { name: "New Character", role: "Mystery", personality: "Unknown", speakingStyle: "Quiet", visualDescription: "Blurry" };
        const finalData = { ...fallback, ...data };

        return {
            id: crypto.randomUUID(),
            name: finalData.name,
            role: finalData.role,
            personality: finalData.personality,
            speakingStyle: finalData.speakingStyle,
            visualDescription: finalData.visualDescription,
            isUserControlled: false
        };
    });
};

/**
 * RECONSTRUCTS the future plot based on a Director Command (God Mode).
 */
export const regenerateFuturePlot = async (
    script: Script, 
    directorCommand: string, 
    settings?: AppSettings
): Promise<string[]> => {
    return withRetry(async () => {
        const historySummary = script.history.slice(-10).map(h => h.content).join(" ");
        const promptText = `
            Title: ${script.title}
            Current Plot Plan: ${JSON.stringify(script.plotPoints)}
            Recent Events: ${historySummary}
            EVENT: The Director (God) has intervened with this command: "${directorCommand}".
            TASK: Rewrite the remaining plot points to logically follow this new event. 
            The story must change direction based on this intervention.
            Return a JSON object with property "newPlotPoints" (array of strings).
        `;

        let data;
        if (settings?.activeProvider === 'OPENROUTER') {
            data = await callOpenRouter(settings, [{ role: "user", content: promptText }], true);
        } else {
            const ai = getClient(settings);
            const response = await ai.models.generateContent({
                model: TEXT_MODEL,
                contents: promptText,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            newPlotPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
                        }
                    }
                }
            });
            data = safeJsonParse(response.text || "{}", {});
        }

        return data.newPlotPoints || script.plotPoints;
    });
};

/**
 * Refines text (Standard).
 */
export const refineText = async (
  currentText: string, 
  fieldType: string, 
  scriptContext: Script, 
  lang: Language = 'zh-CN',
  settings?: AppSettings
): Promise<string> => {
  return withRetry(async () => {
    const langInstruction = lang === 'zh-CN' ? "Respond in Simplified Chinese." : "Respond in English.";
    const promptText = `
      Context: ${scriptContext.title}.
      Task: Improve this "${fieldType}" to be more dramatic and concise.
      Text: "${currentText}"
      ${langInstruction}
      Return ONLY the refined text string.
    `;

    if (settings?.activeProvider === 'OPENROUTER') {
        return await callOpenRouter(settings, [{ role: "user", content: promptText }]);
    } else {
        const ai = getClient(settings);
        const response = await ai.models.generateContent({
            model: TEXT_MODEL,
            contents: promptText
        });
        return response.text?.trim() || currentText;
    }
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
    const langInstruction = lang === 'zh-CN' ? "Respond in Simplified Chinese." : "Respond in English.";
    
    // Context window
    const recentHistory = script.history.slice(-15);
    const historyText = recentHistory.map(m => {
      const charName = script.characters.find(c => c.id === m.characterId)?.name || "Narrator";
      return `${charName} [${m.type}]: ${m.content}`;
    }).join("\n");

    const characterProfiles = script.characters.map(c => 
      `Name: ${c.name}, Style: ${c.speakingStyle}, Personality: ${c.personality}`
    ).join("\n");

    let promptContext = "";
    if (forcedDirectorCommand) {
        promptContext = `
        URGENT: The Director executed: "${forcedDirectorCommand}".
        You MUST generate the immediate reaction to this.
        If it's an action, narrate it. If a character reacts, have them speak.
        Integrate this event smoothly.
        `;
    } else {
        promptContext = `
        Progress the story towards: "${script.plotPoints[0] || 'Conclusion'}".
        Ensure characters speak according to their Style.
        `;
    }

    const promptText = `
      Title: ${script.title}
      Setting: ${script.setting}
      Chars: ${characterProfiles}
      History: ${historyText}
      ${promptContext}
      Task: Generate NEXT beat.
      ${langInstruction}
      Return JSON: { "characterName": "...", "type": "dialogue|action|narration", "content": "..." }
    `;

    let data;
    if (settings?.activeProvider === 'OPENROUTER') {
         data = await callOpenRouter(settings, [{ role: "user", content: promptText }], true);
    } else {
        const ai = getClient(settings);
        const response = await ai.models.generateContent({
          model: TEXT_MODEL,
          contents: promptText,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                characterName: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["dialogue", "action", "narration"] },
                content: { type: Type.STRING }
              }
            }
          }
        });
        data = safeJsonParse(response.text || "{}", {});
    }

    const fallback = { characterName: 'Narrator', type: 'narration', content: '...' };
    const finalData = { ...fallback, ...data };

    let charId = 'narrator';
    if (finalData.characterName !== 'Narrator') {
      const char = script.characters.find(c => c.name === finalData.characterName);
      if (char) charId = char.id;
    }

    return {
      characterId: charId,
      content: finalData.content || "...",
      type: (finalData.type as any) || 'narration'
    };
  });
};

/**
 * Generates an avatar. 
 * NOTE: Image generation always uses Gemini (default key or user key) as OpenRouter image API is different.
 */
export const generateAvatarImage = async (character: Character, settings?: AppSettings): Promise<string> => {
  return withRetry(async () => {
    // Always use Google Client for images (supports default key)
    const ai = getClient(settings); 
    const prompt = `Portrait of ${character.name}, ${character.role}, ${character.visualDescription}. High quality, stylized avatar, headshot.`;
    
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: { parts: [{ text: prompt }] }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts && parts[0]?.inlineData?.data) {
        return `data:${parts[0].inlineData.mimeType};base64,${parts[0].inlineData.data}`;
    }
    throw new Error("No image data");
  });
};

/**
 * Generates a scene illustration.
 */
export const generateSceneImage = async (sceneDescription: string, scriptTitle: string, settings?: AppSettings): Promise<string> => {
  return withRetry(async () => {
    // Always use Google Client for images
    const ai = getClient(settings);
    const desc = sceneDescription.length > 300 ? sceneDescription.substring(0, 300) : sceneDescription;
    const prompt = `Cinematic shot, ${scriptTitle}, ${desc}. 4k, detailed, atmospheric.`;

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: { parts: [{ text: prompt }] }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts && parts[0]?.inlineData?.data) {
        return `data:${parts[0].inlineData.mimeType};base64,${parts[0].inlineData.data}`;
    }
    throw new Error("No image data");
  });
};
