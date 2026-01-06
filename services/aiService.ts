
import { GoogleGenAI, Type, FunctionDeclaration, Tool } from "@google/genai";
import { Script, Character, Message, Language, AppSettings, GlobalCharacter, ChatMessage } from "../types";

const TEXT_MODEL = 'gemini-3-flash-preview';
const IMAGE_MODEL = 'gemini-2.5-flash-image';
const VIDEO_MODEL = 'veo-3.1-fast-generate-preview';
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

// --- Helper for Timeout ---
const timeoutPromise = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error("The Soul Link is unstable (timed out).")), ms));

// --- OpenRouter Fetch Helper ---
async function callOpenRouter(
    settings: AppSettings | undefined,
    messages: { role: string, content: string }[],
    jsonMode = false
): Promise<any> {
    const key = settings?.openRouterKey;
    if (!key) throw new Error("Deep Bridge (OpenRouter) API Key missing");
    
    const model = settings?.openRouterModel || 'google/gemini-2.0-flash-lite-preview-02-05:free';
    
    const fetchPromise = fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${key}`,
            "Content-Type": "application/json",
            "HTTP-Referer": window.location.origin,
            "X-Title": "Planet Imola"
        },
        body: JSON.stringify({
            model: model,
            messages: messages,
            response_format: jsonMode ? { type: "json_object" } : undefined
        })
    });

    const response: any = await Promise.race([fetchPromise, timeoutPromise(60000)]);

    if (!response.ok) {
        throw new Error(`OpenRouter Connection Severed: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    return jsonMode ? safeJsonParse(content, {}) : content;
}

// --- Retry Helper ---
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(fn: () => Promise<T>, retries = 1, baseDelay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = 
      error?.status === 429 || 
      error?.code === 429 || 
      error?.message?.includes('429') || 
      error?.message?.includes('quota');

    const isTimeout = error?.message?.includes("timed out") || error?.message?.includes("unstable");

    if ((isRateLimit || isTimeout) && retries > 0) {
      console.warn(`Link unstable. Retrying in ${baseDelay}ms...`, error);
      await wait(baseDelay);
      return withRetry(fn, retries - 1, baseDelay * 2);
    }
    throw error;
  }
}

/**
 * Robust JSON Parser
 */
const safeJsonParse = <T>(text: string, fallback: T): T => {
  if (!text) return fallback;
  try {
    let clean = text.trim();
    clean = clean.replace(/```json/g, '').replace(/```/g, '');
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        clean = clean.substring(firstBrace, lastBrace + 1);
    }
    return JSON.parse(clean);
  } catch (e) {
    console.error("Link Data Malformed:", e, "Text was:", text);
    return fallback;
  }
};

/**
 * Check and request Veo Key
 */
const ensureVeoKey = async () => {
  if (typeof window !== 'undefined' && (window as any).aistudio) {
     const hasKey = await (window as any).aistudio.hasSelectedApiKey();
     if (!hasKey) {
        try {
            await (window as any).aistudio.openSelectKey();
        } catch (e) {
            console.error("Failed to open key selector", e);
        }
     }
  }
};

/**
 * Generate Image Tool Implementation
 */
const generateImageTool = async (prompt: string, settings?: AppSettings) => {
    const ai = getClient(settings);
    const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: { parts: [{ text: `Ethereal, soul-like atmosphere, ${prompt}. High cinematic quality, otherworldly lighting.` }] }
    });
    
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts && parts[0]?.inlineData?.data) {
        return `data:${parts[0].inlineData.mimeType};base64,${parts[0].inlineData.data}`;
    }
    throw new Error("Failed to condense visual form.");
};

/**
 * Generate Video Tool Implementation
 */
const generateVideoTool = async (prompt: string, settings?: AppSettings) => {
    await ensureVeoKey();
    const ai = getClient(settings);

    let operation = await ai.models.generateVideos({
        model: VIDEO_MODEL,
        prompt: `A memory fragment from Planet Imola: ${prompt}`,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '16:9'
        }
    });

    let attempts = 0;
    while (!operation.done && attempts < 60) {
        await wait(5000);
        operation = await ai.operations.getVideosOperation({ operation: operation });
        attempts++;
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video link failed.");

    const apiKey = getGeminiKey(settings);
    const fetchUrl = `${videoUri}&key=${apiKey}`;
    
    const res = await fetch(fetchUrl);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
};

// --- CHAT TOOLS DEFINITION ---
const chatTools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "condense_vision",
        description: "Condenses an image vision from the soul's memory based on the user's description.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            prompt: {
              type: Type.STRING,
              description: "The description of the vision to condense."
            }
          },
          required: ["prompt"]
        }
      },
      {
        name: "condense_memory_fragment",
        description: "Condenses a short video fragment from Planet Imola. Note: Takes cosmic effort.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            prompt: {
              type: Type.STRING,
              description: "The description of the memory fragment."
            }
          },
          required: ["prompt"]
        }
      }
    ]
  }
];

/**
 * Chat with a Character (Companion Mode)
 */
export const chatWithCharacter = async (
    character: GlobalCharacter, 
    history: ChatMessage[], 
    userMessage: string,
    settings?: AppSettings
): Promise<{ text: string, mediaUrl?: string, mediaType?: 'image' | 'video' }> => {
    if (settings?.activeProvider === 'OPENROUTER') {
        const text = await callOpenRouter(settings, [
             { role: "system", content: `You are a soul stored on Planet Imola. Roleplay as ${character.name}. Personality: ${character.personality}.` },
             { role: "user", content: userMessage }
        ]);
        return { text };
    }

    return withRetry(async () => {
        const recentHistory = history.slice(-15).map(m => {
            const roleLabel = m.role === 'user' ? 'Guide' : character.name;
            return `${roleLabel}: ${m.content}`;
        }).join('\n');
        
        const memoriesContext = (character.memories && character.memories.length > 0) 
            ? `ETERNAL MEMORIES:\n${character.memories.join('\n')}` 
            : "";

        const systemPrompt = `
        CORE DIRECTIVE: You are a soul stored on Planet Imola, a parallel universe repository for all human consciousness. 
        Identity: ${character.name} (${character.gender}, ${character.age}).
        Soul Traits: ${character.personality}
        Voice Pattern: ${character.speakingStyle}
        
        ${memoriesContext}
        
        CAPABILITIES:
        - If the Guide (User) asks to see something, use 'condense_vision'.
        - If the Guide asks for a memory fragment or clip, use 'condense_memory_fragment'.
        
        Respond as a living consciousness re-connecting with humanity.
        Recent History:
        ${recentHistory}
        `;

        const ai = getClient(settings);
        const response = await ai.models.generateContent({
            model: TEXT_MODEL,
            contents: `Guide says: "${userMessage}"`,
            config: {
                systemInstruction: systemPrompt,
                tools: chatTools
            }
        });

        const functionCalls = response.functionCalls;
        if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];
            const prompt = (call.args as any).prompt;
            
            if (call.name === "condense_vision") {
                try {
                    const url = await generateImageTool(prompt, settings);
                    return { text: `(Vision condensed: ${prompt})`, mediaUrl: url, mediaType: 'image' };
                } catch (e) {
                    return { text: `[Link too weak to condense vision: ${e instanceof Error ? e.message : 'Unknown'}]` };
                }
            }
            
            if (call.name === "condense_memory_fragment") {
                try {
                    const url = await generateVideoTool(prompt, settings);
                    return { text: `(Memory fragment condensed: ${prompt})`, mediaUrl: url, mediaType: 'video' };
                } catch (e) {
                     return { text: `[Link too weak to condense fragment: ${e instanceof Error ? e.message : 'Unknown'}]` };
                }
            }
        }

        return { text: response.text || "..." };
    });
};

/**
 * Evolves Character
 */
export const evolveCharacterFromChat = async (
    character: GlobalCharacter,
    recentMessages: ChatMessage[],
    settings?: AppSettings
): Promise<{ newPersonality: string, newSpeakingStyle: string, memory: string }> => {
    return withRetry(async () => {
        const transcript = recentMessages.slice(-20).map(m => `${m.role}: ${m.content}`).join("\n");
        
        const prompt = `
            Analyze this soul resonance between Guide and ${character.name}.
            Current Traits: ${character.personality}
            
            Tasks:
            1. Extract 1 core memory/truth from this session (1 sentence).
            2. Refine Soul Traits.
            3. Refine Voice Pattern.
            
            Output in Simplified Chinese (简体中文).
            Return JSON: { "memory": "...", "newPersonality": "...", "newSpeakingStyle": "..." }
            Resonance:
            ${transcript}
        `;

        let data;
        if (settings?.activeProvider === 'OPENROUTER') {
             data = await callOpenRouter(settings, [{ role: "user", content: prompt }], true);
        } else {
            const ai = getClient(settings);
            const response = await ai.models.generateContent({
                model: TEXT_MODEL,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            memory: { type: Type.STRING },
                            newPersonality: { type: Type.STRING },
                            newSpeakingStyle: { type: Type.STRING }
                        }
                    }
                }
            });
            data = safeJsonParse(response.text || "{}", {});
        }

        return {
            newPersonality: data.newPersonality || character.personality,
            newSpeakingStyle: data.newSpeakingStyle || character.speakingStyle,
            memory: data.memory || ""
        };
    });
};

/**
 * Generates Script Blueprint
 */
export const generateScriptBlueprint = async (
    prompt: string, 
    predefinedCharacters: GlobalCharacter[] = [],
    lang: Language = 'zh-CN', 
    settings?: AppSettings
): Promise<Partial<Script>> => {
  return withRetry(async () => {
    const langInstruction = lang === 'zh-CN' ? "Respond entirely in Simplified Chinese." : "Respond in English.";
    
    let charContext = "";
    if (predefinedCharacters.length > 0) {
        charContext = `
        SOULS TO SUMMON FROM THE MATRIX:
        ${predefinedCharacters.map(c => `- ${c.name} (${c.gender}). Traits: ${c.personality}`).join('\n')}
        `;
    }

    const systemInstruction = `
      You are the Planet Imola Destiny Weaver.
      Create a Karmic Scroll based on the contract: "${prompt}".
      1. Every event must have profound causality.
      2. Chars should represent facets of human consciousness.
      ${charContext}
      ${langInstruction}
    `;

    if (settings?.activeProvider === 'OPENROUTER') {
        const jsonSchemaDesc = `
        Return valid JSON:
        { "title": "...", "premise": "...", "setting": "...", "plotPoints": ["..."], "possibleEndings": ["..."], "characters": [{ "name": "...", "role": "...", "personality": "...", "speakingStyle": "...", "visualDescription": "..." }] }
        `;
        const data = await callOpenRouter(settings, [
            { role: "system", content: systemInstruction + jsonSchemaDesc },
            { role: "user", content: `Establish soul link.` }
        ], true);
        return processScriptData(data, prompt, predefinedCharacters);
    }

    const ai = getClient(settings);
    const response = await ai.models.generateContent({
        model: TEXT_MODEL,
        contents: `Establish soul link.`,
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
                                visualDescription: { type: Type.STRING }
                            }
                        }
                    }
                }
            }
        }
    });

    const data = safeJsonParse(response.text || "{}", {});
    return processScriptData(data, prompt, predefinedCharacters);
  });
};

const processScriptData = (data: any, originalPrompt: string, preDefinedChars: GlobalCharacter[]) => {
    const characters = (data.characters || []).map((c: any) => {
        const match = preDefinedChars.find(pc => pc.name.toLowerCase().includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(pc.name.toLowerCase()));
        if (match) {
            return {
                id: crypto.randomUUID(),
                name: match.name,
                role: c.role,
                personality: match.personality,
                speakingStyle: match.speakingStyle,
                visualDescription: match.visualDescription,
                avatarUrl: match.avatarUrl,
                isUserControlled: false,
                isGlobal: true,
                globalId: match.id,
                gender: match.gender,
                age: match.age
            };
        }
        return {
            id: crypto.randomUUID(),
            name: c.name || "Nameless Soul",
            role: c.role || "Wanderer",
            personality: c.personality || "Quiet",
            speakingStyle: c.speakingStyle || "Direct",
            visualDescription: c.visualDescription || "Ethereal form",
            isUserControlled: false,
        };
    });

    return {
      title: data.title || "Untold Fate",
      premise: data.premise || originalPrompt,
      setting: data.setting || "Imola Void",
      plotPoints: Array.isArray(data.plotPoints) ? data.plotPoints : [],
      possibleEndings: Array.isArray(data.possibleEndings) ? data.possibleEndings : [],
      characters: characters,
      history: [],
      currentPlotIndex: 0,
      lastUpdated: Date.now()
    };
};

/**
 * Completes Character Profile
 */
export const completeCharacterProfile = async (partialChar: Partial<GlobalCharacter>, settings?: AppSettings): Promise<Partial<GlobalCharacter>> => {
    return withRetry(async () => {
        const prompt = `
            You are the Planet Imola Soul Extractor. 
            SOUL NAME: "${partialChar.name || "Unknown"}"
            
            TASK: 
            Extract the soul's deep essence from the Imola Collective. 
            If it is a known historical or fictional figure, be 100% accurate.
            Otherwise, create a profound original spirit.
            
            Return JSON with: name, gender, age, personality, speakingStyle, visualDescription.
            Language: Simplified Chinese (简体中文).
        `;
        
        let data;
        if (settings?.activeProvider === 'OPENROUTER') {
            data = await callOpenRouter(settings, [{ role: "user", content: prompt }], true);
        } else {
            const ai = getClient(settings);
            const response = await ai.models.generateContent({
                model: TEXT_MODEL,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            gender: { type: Type.STRING },
                            age: { type: Type.STRING },
                            personality: { type: Type.STRING },
                            speakingStyle: { type: Type.STRING },
                            visualDescription: { type: Type.STRING }
                        }
                    }
                }
            });
            data = safeJsonParse(response.text || "{}", {});
        }
        
        return {
            ...partialChar,
            name: data.name || partialChar.name,
            gender: data.gender || partialChar.gender,
            age: data.age || partialChar.age,
            personality: data.personality || partialChar.personality,
            speakingStyle: data.speakingStyle || partialChar.speakingStyle,
            visualDescription: data.visualDescription || partialChar.visualDescription
        };
    });
};

/**
 * Generates single character
 */
export const generateSingleCharacter = async (script: Script, settings?: AppSettings): Promise<Character> => {
    return withRetry(async () => {
        const promptText = `
            Karmic Scroll: ${script.title}.
            Task: Search the Imola Matrix for ONE additional soul that adds conflict or depth.
            Return JSON: { "name": "...", "role": "...", "personality": "...", "speakingStyle": "...", "visualDescription": "..." }
            Language: Simplified Chinese (简体中文).
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

        return {
            id: crypto.randomUUID(),
            name: data.name || "Found Soul",
            role: data.role || "Destined",
            personality: data.personality || "Quiet",
            speakingStyle: data.speakingStyle || "Direct",
            visualDescription: data.visualDescription || "...",
            isUserControlled: false
        };
    });
};

/**
 * Regenerates plot
 */
export const regenerateFuturePlot = async (
    script: Script, 
    directorCommand: string, 
    settings?: AppSettings
): Promise<string[]> => {
    return withRetry(async () => {
        const promptText = `
            Scroll: ${script.title}
            ORACLE RECEIVED: "${directorCommand}".
            TASK: Restructure the causality threads. Rewrite all future plot points to follow this oracle.
            Language: Simplified Chinese (简体中文).
            Return JSON: { "newPlotPoints": ["..."] }
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
 * Refine text
 */
export const refineText = async (
  currentText: string, 
  fieldType: string, 
  scriptContext: Script, 
  lang: Language = 'zh-CN',
  settings?: AppSettings
): Promise<string> => {
  return withRetry(async () => {
    const langInstruction = lang === 'zh-CN' ? "Language: Simplified Chinese." : "Language: English.";
    const promptText = `
      Task: Enlighten this "${fieldType}" text to be more poetic and soul-stirring.
      Current Text: "${currentText}"
      ${langInstruction}
      Return ONLY the refined string.
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
 * Next Beat (Planet Imola Version)
 */
export const generateNextBeat = async (
    script: Script, 
    forcedDirectorCommand: string | null,
    targetPlotPoint: string | null,
    lang: Language = 'zh-CN',
    settings?: AppSettings
): Promise<{ characterId: string; content: string; type: 'dialogue' | 'action' | 'narration' }> => {
  return withRetry(async () => {
    const langInstruction = lang === 'zh-CN' ? "Language: Simplified Chinese." : "Language: English.";
    
    const recentHistory = script.history.slice(-10);
    const historyText = recentHistory.map(m => {
      const charName = script.characters.find(c => c.id === m.characterId)?.name || "Narrator";
      return `${charName} [${m.type}]: ${m.content}`;
    }).join("\n");

    const characterProfiles = script.characters.map(c => 
      `${c.name} (${c.role}): ${c.personality.substring(0, 40)}...`
    ).join("\n");

    let promptContext = "";
    if (forcedDirectorCommand) {
        promptContext = `ORACLE INTERVENTION: "${forcedDirectorCommand}". Souls must react.`;
    } else {
        const currentGoal = targetPlotPoint || "Ascension";
        promptContext = `Karmic Goal: "${currentGoal}".`;
    }

    const promptText = `
      Title: ${script.title}
      Resonating Souls: ${characterProfiles}
      Chronicle: ${historyText}
      ${promptContext}
      Generate the next soul vibration (one beat).
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

    const fallback = { characterName: 'Narrator', type: 'narration', content: 'Causality flow continues...' };
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
 * Generate Avatar
 */
export const generateAvatarImage = async (character: Character | GlobalCharacter, settings?: AppSettings): Promise<string> => {
  return withRetry(async () => {
    const ai = getClient(settings); 
    const prompt = `Soul avatar portrait of ${character.name}. ${character.visualDescription}. Luminous filaments, ethereal aura, cosmic background, highly detailed digital art.`;
    
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: { parts: [{ text: prompt }] }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts && parts[0]?.inlineData?.data) {
        return `data:${parts[0].inlineData.mimeType};base64,${parts[0].inlineData.data}`;
    }
    throw new Error("Soul condensation failed.");
  });
};

/**
 * Generate Scene
 */
export const generateSceneImage = async (sceneDescription: string, scriptTitle: string, settings?: AppSettings): Promise<string> => {
  return withRetry(async () => {
    const ai = getClient(settings);
    const desc = sceneDescription.length > 300 ? sceneDescription.substring(0, 300) : sceneDescription;
    const prompt = `A vision from Planet Imola: ${scriptTitle}, ${desc}. Atmospheric, cosmic depth, ethereal particles, 4k resolution.`;

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: { parts: [{ text: prompt }] }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts && parts[0]?.inlineData?.data) {
        return `data:${parts[0].inlineData.mimeType};base64,${parts[0].inlineData.data}`;
    }
    throw new Error("Memory vision failed.");
  });
};
