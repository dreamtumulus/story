
import { GoogleGenAI, Type, FunctionDeclaration, Tool } from "@google/genai";
import { Script, Character, Message, Language, AppSettings, GlobalCharacter, ChatMessage, NovelStyle } from "../types";

// --- 模型常量定义 ---
const TEXT_MODEL = 'gemini-2.5-flash';
const IMAGE_MODEL = 'gemini-2.5-flash-image';
const VIDEO_MODEL = 'veo-3.1-fast-generate-preview';
const DEFAULT_GEMINI_KEY = 'AIzaSyC6zQSEAAdLRgOMR6_CwQ1sSNVur0_vpW0';

// --- 超时设置 ---
const STANDARD_TIMEOUT = 60000; 
const HEAVY_TASK_TIMEOUT = 180000;

// --- UUID Polyfill ---
export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// --- 安全的环境变量获取 ---
const getEnvVar = (key: string): string | undefined => {
    try {
        if (typeof process !== 'undefined' && process.env) {
            return process.env[key];
        }
    } catch (e) {}
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            // @ts-ignore
            return import.meta.env[key];
        }
    } catch (e) {}
    return undefined;
};

const getGeminiKey = (settings?: AppSettings) => {
    return settings?.apiKey || getEnvVar('API_KEY') || DEFAULT_GEMINI_KEY;
};

const getClient = (settings?: AppSettings) => {
    const apiKey = getGeminiKey(settings);
    if (!apiKey) throw new Error("No API Key");
    return new GoogleGenAI({ apiKey });
};

const timeoutPromise = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out")), ms));

// --- OpenRouter 调用辅助函数 ---
async function callOpenRouter(
    settings: AppSettings | undefined,
    messages: { role: string, content: string }[],
    jsonMode = false,
    timeoutMs = STANDARD_TIMEOUT
): Promise<any> {
    const key = settings?.openRouterKey;
    if (!key) throw new Error("OpenRouter API Key missing");
    
    const model = settings?.openRouterModel || 'google/gemini-2.0-flash-lite-preview-02-05:free';
    
    const fetchPromise = fetch("https://openrouter.ai/api/v1/chat/completions", {
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

    const response: any = await Promise.race([fetchPromise, timeoutPromise(timeoutMs)]);

    if (!response.ok) {
        throw new Error(`OpenRouter Error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    return jsonMode ? safeJsonParse(content, {}) : content;
}

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

    const isTimeout = error?.message === "Request timed out" || error?.message?.includes("timed out");

    if ((isRateLimit || isTimeout) && retries > 0) {
      console.warn(`Operation failed. Retrying in ${baseDelay}ms...`, error);
      await wait(baseDelay);
      return withRetry(fn, retries - 1, baseDelay * 2);
    }
    throw error;
  }
}

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
    console.error("JSON Parse Failed:", e, "Text was:", text);
    return fallback;
  }
};

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

const generateImageTool = async (prompt: string, settings?: AppSettings) => {
    const ai = getClient(settings);
    const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: { parts: [{ text: prompt }] },
    });
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts && parts[0]?.inlineData?.data) {
        return `data:${parts[0].inlineData.mimeType};base64,${parts[0].inlineData.data}`;
    }
    throw new Error("Failed to generate image.");
};

const generateVideoTool = async (prompt: string, settings?: AppSettings) => {
    await ensureVeoKey();
    const ai = getClient(settings);
    let operation = await ai.models.generateVideos({
        model: VIDEO_MODEL,
        prompt: prompt,
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
    });
    let attempts = 0;
    while (!operation.done && attempts < 60) {
        await wait(5000);
        operation = await ai.operations.getVideosOperation({ operation: operation });
        attempts++;
    }
    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video generation failed or returned no URI");
    const apiKey = getGeminiKey(settings);
    const fetchUrl = `${videoUri}&key=${apiKey}`;
    const res = await fetch(fetchUrl);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
};

const chatTools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "generate_image",
        description: "Generates an image/picture/photo based on the user's description.",
        parameters: {
          type: Type.OBJECT,
          properties: { prompt: { type: Type.STRING, description: "Description." } },
          required: ["prompt"]
        }
      },
      {
        name: "generate_video",
        description: "Generates a short video/clip based on the user's description. Note: This takes time.",
        parameters: {
          type: Type.OBJECT,
          properties: { prompt: { type: Type.STRING, description: "Description." } },
          required: ["prompt"]
        }
      }
    ]
  }
];

export const chatWithCharacter = async (character: GlobalCharacter, history: ChatMessage[], userMessage: string, settings?: AppSettings): Promise<{ text: string, mediaUrl?: string, mediaType?: 'image' | 'video' }> => {
    if (settings?.activeProvider === 'OPENROUTER') {
        const text = await callOpenRouter(settings, [{ role: "system", content: `Roleplay as ${character.name}.` }, { role: "user", content: userMessage }]);
        return { text };
    }
    return withRetry(async () => {
        const recentHistory = history.slice(-15).map(m => `${m.role === 'user' ? 'User' : character.name}: ${m.content}`).join('\n');
        const memoriesContext = (character.memories && character.memories.length > 0) ? `LONG-TERM MEMORIES:\n${character.memories.join('\n')}` : "";
        const systemPrompt = `You are roleplaying as ${character.name}. Traits: ${character.gender}, ${character.age}. Personality: ${character.personality}. Style: ${character.speakingStyle}. ${memoriesContext}. Respond naturally.`;
        const ai = getClient(settings);
        const response = await ai.models.generateContent({
            model: TEXT_MODEL,
            contents: `User says: "${userMessage}"`,
            config: { systemInstruction: systemPrompt, tools: chatTools }
        });
        const functionCalls = response.functionCalls;
        if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];
            const prompt = (call.args as any).prompt;
            if (call.name === "generate_image") {
                const url = await generateImageTool(prompt, settings);
                return { text: `(Generated image: ${prompt})`, mediaUrl: url, mediaType: 'image' };
            }
            if (call.name === "generate_video") {
                const url = await generateVideoTool(prompt, settings);
                return { text: `(Generated video: ${prompt})`, mediaUrl: url, mediaType: 'video' };
            }
        }
        return { text: response.text || "..." };
    });
};

export const evolveCharacterFromChat = async (character: GlobalCharacter, recentMessages: ChatMessage[], settings?: AppSettings): Promise<{ newPersonality: string, newSpeakingStyle: string, memory: string }> => {
    return withRetry(async () => {
        const transcript = recentMessages.slice(-20).map(m => `${m.role}: ${m.content}`).join("\n");
        const prompt = `Analyze chat between User and ${character.name} (${character.personality}). 1. Summarize 1 key fact as "Memory". 2. Refine "Personality". 3. Refine "Speaking Style". Simplified Chinese. JSON: { memory, newPersonality, newSpeakingStyle }. Transcript: ${transcript}`;
        const ai = getClient(settings);
        const response = await ai.models.generateContent({
            model: TEXT_MODEL, contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { memory: { type: Type.STRING }, newPersonality: { type: Type.STRING }, newSpeakingStyle: { type: Type.STRING } } } }
        });
        const data = safeJsonParse<{ memory?: string; newPersonality?: string; newSpeakingStyle?: string }>(response.text || "{}", {});
        return { newPersonality: data.newPersonality || character.personality, newSpeakingStyle: data.newSpeakingStyle || character.speakingStyle, memory: data.memory || "" };
    });
};

// --- NEW: Step 1 - Initialize Basic Script Info ---
export const generateScriptBasic = async (prompt: string, characters: GlobalCharacter[], lang: Language = 'zh-CN', settings?: AppSettings): Promise<{ title: string, setting: string }> => {
    return withRetry(async () => {
        const charNames = characters.map(c => c.name).join(", ");
        const promptText = `
            Context: A user wants to create a story featuring characters: [${charNames}].
            User Idea: "${prompt}"
            
            Task:
            1. Create a Creative Title.
            2. Describe the Setting (Time/Place/Atmosphere).
            
            Do NOT generate plot points yet.
            Respond in Simplified Chinese.
            JSON: { "title": "string", "setting": "string" }
        `;
        
        if (settings?.activeProvider === 'OPENROUTER') {
             const data = await callOpenRouter(settings, [{ role: "user", content: promptText }], true);
             return { title: data.title || "Untitled", setting: data.setting || "Unknown" };
        } else {
            const ai = getClient(settings);
            const response = await ai.models.generateContent({
                model: TEXT_MODEL, contents: promptText,
                config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, setting: { type: Type.STRING } } } }
            });
            const data = safeJsonParse<{ title?: string; setting?: string }>(response.text || "{}", {});
            return { title: data.title || "Untitled", setting: data.setting || "Unknown" };
        }
    });
}

// --- NEW: Step 2 - Generate Next Plot Segment ---
export const generateNextPlotSegment = async (script: Script, settings?: AppSettings): Promise<string> => {
    return withRetry(async () => {
        const existingPoints = script.plotPoints.map((p, i) => `${i+1}. ${p}`).join("\n");
        const promptText = `
            Title: ${script.title}
            Setting: ${script.setting}
            Premise: ${script.premise}
            Characters: ${script.characters.map(c => c.name).join(', ')}
            
            Current Plot Outline:
            ${existingPoints}
            
            Task: Generate the NEXT logical scene/chapter outline (1 sentence).
            Ensure it moves the story forward meaningfully.
            Respond in Simplified Chinese.
            Return ONLY the string of the next plot point.
        `;

        if (settings?.activeProvider === 'OPENROUTER') {
            return await callOpenRouter(settings, [{ role: "user", content: promptText }]);
        } else {
            const ai = getClient(settings);
            const response = await ai.models.generateContent({ model: TEXT_MODEL, contents: promptText });
            return response.text?.trim() || "Next Scene";
        }
    });
};


export const completeCharacterProfile = async (partialChar: Partial<GlobalCharacter>, settings?: AppSettings): Promise<Partial<GlobalCharacter>> => {
    return withRetry(async () => {
        const prompt = `User Input Name: "${partialChar.name}". Analyze name. Is it famous? Match persona. Focus on Personality/Speaking Style. Visual brief. Role/Occupation. Simplified Chinese. JSON: {name, gender, age, personality, speakingStyle, visualDescription, role}.`;
        const ai = getClient(settings);
        const response = await ai.models.generateContent({
            model: TEXT_MODEL, contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, gender: { type: Type.STRING }, age: { type: Type.STRING }, personality: { type: Type.STRING }, speakingStyle: { type: Type.STRING }, visualDescription: { type: Type.STRING }, role: { type: Type.STRING } } } }
        });
        const data = safeJsonParse<any>(response.text || "{}", {});
        return { ...partialChar, ...data };
    });
};

export const generateSingleCharacter = async (script: Script, settings?: AppSettings): Promise<Character> => {
    return withRetry(async () => {
        const promptText = `Context: ${script.title}. Characters: ${script.characters.map(c => c.name).join(', ')}. Create ONE new unique character. Simplified Chinese. JSON: { name, role, personality, speakingStyle, visualDescription }.`;
        const ai = getClient(settings);
        const response = await ai.models.generateContent({
            model: TEXT_MODEL, contents: promptText,
            config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, role: { type: Type.STRING }, personality: { type: Type.STRING }, speakingStyle: { type: Type.STRING }, visualDescription: { type: Type.STRING } } } }
        });
        const data = safeJsonParse<{ name?: string; role?: string; personality?: string; speakingStyle?: string; visualDescription?: string }>(response.text || "{}", {});
        return { 
          id: generateId(), 
          name: data.name || "Unknown", 
          role: data.role || "Character", 
          personality: data.personality || "Standard", 
          speakingStyle: data.speakingStyle || "Normal", 
          visualDescription: data.visualDescription || "Standard", 
          isUserControlled: false 
        };
    });
};

export const regenerateFuturePlot = async (script: Script, directorCommand: string, settings?: AppSettings): Promise<string[]> => {
    return withRetry(async () => {
        const promptText = `Title: ${script.title}. Event: Director said "${directorCommand}". Rewrite remaining plot points. Simplified Chinese. JSON: { newPlotPoints: [] }`;
        const ai = getClient(settings);
        const response = await ai.models.generateContent({
            model: TEXT_MODEL, contents: promptText,
            config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { newPlotPoints: { type: Type.ARRAY, items: { type: Type.STRING } } } } }
        });
        const data = safeJsonParse<{ newPlotPoints?: string[] }>(response.text || "{}", {});
        return data.newPlotPoints || script.plotPoints;
    });
};

export const generateNextChapterPlan = async (script: Script, upcomingPlotPoint: string, settings?: AppSettings): Promise<string> => {
    return withRetry(async () => {
        const promptText = `Title: ${script.title}. Original Next Chapter: "${upcomingPlotPoint}". Propose a refined goal. Simplified Chinese. Return String.`;
        const ai = getClient(settings);
        const response = await ai.models.generateContent({ model: TEXT_MODEL, contents: promptText });
        return response.text?.trim() || upcomingPlotPoint;
    });
};

export const autoCompleteStory = async (script: Script, settings?: AppSettings): Promise<Message[]> => {
    return withRetry(async () => {
        const promptText = `Title: ${script.title}. Remaining Chapters: ${JSON.stringify(script.plotPoints.slice(script.currentPlotIndex))}. Generate narration for EACH to finish story. Simplified Chinese. JSON: { narrations: [] }`;
        const ai = getClient(settings);
        const response = await ai.models.generateContent({
            model: TEXT_MODEL, contents: promptText,
            config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { narrations: { type: Type.ARRAY, items: { type: Type.STRING } } } } }
        });
        const data = safeJsonParse<{ narrations?: string[] }>(response.text || "{}", {});
        return (data.narrations || []).map((content: string) => ({ id: generateId(), characterId: 'narrator', type: 'narration', content, timestamp: Date.now() }));
    });
};

export const generateNovelVersion = async (script: Script, style: NovelStyle, settings?: AppSettings): Promise<string> => {
    return withRetry(async () => {
        const fullHistory = script.history.map(h => {
            const charName = script.characters.find(c => c.id === h.characterId)?.name || "Narrator";
            return `${charName}: ${h.content}`;
        }).join("\n");
        const promptText = `Write a novel chapter based on this script history. Style: ${style}. Simplified Chinese. History: ${fullHistory}`;
        const ai = getClient(settings);
        const response = await ai.models.generateContent({ model: TEXT_MODEL, contents: promptText });
        return response.text || "Failed to generate novel.";
    });
};

export const refineText = async (currentText: string, fieldType: string, scriptContext: Script, lang: Language = 'zh-CN', settings?: AppSettings): Promise<string> => {
    return withRetry(async () => {
        const promptText = `Improve this "${fieldType}": "${currentText}". Context: ${scriptContext.title}. Simplified Chinese. Return String.`;
        const ai = getClient(settings);
        const response = await ai.models.generateContent({ model: TEXT_MODEL, contents: promptText });
        return response.text?.trim() || currentText;
    });
};

export const refineCharacterTrait = async (currentText: string, characterName: string, traitType: string, lang: Language = 'zh-CN', settings?: AppSettings): Promise<string> => {
    return withRetry(async () => {
        const promptText = `Character: ${characterName}. Improve "${traitType}": "${currentText}". Deep, psychological. Simplified Chinese. Return String.`;
        const ai = getClient(settings);
        const response = await ai.models.generateContent({ model: TEXT_MODEL, contents: promptText });
        return response.text?.trim() || currentText;
    });
}

// --- UPDATED: Generate Next Beat (Prioritize Plot) ---
export const generateNextBeat = async (script: Script, forcedDirectorCommand: string | null, targetPlotPoint: string | null, lang: Language = 'zh-CN', settings?: AppSettings): Promise<{ characterId: string; content: string; type: 'dialogue' | 'action' | 'narration' }> => {
  return withRetry(async () => {
    const recentHistory = script.history.slice(-10);
    const historyText = recentHistory.map(m => {
      const charName = script.characters.find(c => c.id === m.characterId)?.name || "Narrator";
      return `${charName} [${m.type}]: ${m.content}`;
    }).join("\n");

    const characterProfiles = script.characters.map(c => 
      `${c.name}: ${c.personality.substring(0, 50)}... Style: ${c.speakingStyle.substring(0,50)}...`
    ).join("\n");

    let promptContext = "";
    if (forcedDirectorCommand) {
        promptContext = `DIRECTOR COMMAND: "${forcedDirectorCommand}". React immediately.`;
    } else {
        const currentGoal = targetPlotPoint || "End";
        // 关键 Prompt 修改：强调优先满足剧情
        promptContext = `
        CURRENT SCENE GOAL: "${currentGoal}".
        CRITICAL INSTRUCTION: Move the story forward to achieve this goal. 
        Characters must act according to their personality/style, BUT satisfying the plot goal is the PRIORITY.
        Avoid empty chatter. Every line must serve the plot or character depth relative to the situation.
        `;
    }

    const promptText = `
      Title: ${script.title}
      Chars: ${characterProfiles}
      History: ${historyText}
      ${promptContext}
      Task: Generate ONE next beat (dialogue/action/narration).
      Language: Simplified Chinese.
      Return JSON: { "characterName": "...", "type": "dialogue|action|narration", "content": "..." }
    `;

    const ai = getClient(settings);
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: promptText,
      config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { characterName: { type: Type.STRING }, type: { type: Type.STRING, enum: ["dialogue", "action", "narration"] }, content: { type: Type.STRING } } } }
    });
    const data = safeJsonParse(response.text || "{}", {});

    const fallback = { characterName: 'Narrator', type: 'narration', content: '...' };
    const finalData = { ...fallback, ...data };

    let charId = 'narrator';
    if (finalData.characterName !== 'Narrator') {
      const char = script.characters.find(c => c.name === finalData.characterName);
      if (char) charId = char.id;
    }

    return { characterId: charId, content: finalData.content || "...", type: (finalData.type as any) || 'narration' };
  });
};

export const generateAvatarImage = async (character: Character | GlobalCharacter, settings?: AppSettings): Promise<string> => {
  return withRetry(async () => {
    const ai = getClient(settings); 
    const prompt = `Portrait of ${character.name}, ${character.gender || ''}, ${character.age || ''}. ${character.visualDescription}. High quality avatar.`;
    const response = await ai.models.generateContent({ model: IMAGE_MODEL, contents: { parts: [{ text: prompt }] } });
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts && parts[0]?.inlineData?.data) return `data:${parts[0].inlineData.mimeType};base64,${parts[0].inlineData.data}`;
    throw new Error("No image data");
  });
};

export const generateSceneImage = async (sceneDescription: string, scriptTitle: string, settings?: AppSettings): Promise<string> => {
  return withRetry(async () => {
    const ai = getClient(settings);
    const desc = sceneDescription.length > 300 ? sceneDescription.substring(0, 300) : sceneDescription;
    const prompt = `Cinematic shot, ${scriptTitle}, ${desc}. 4k, detailed.`;
    const response = await ai.models.generateContent({ model: IMAGE_MODEL, contents: { parts: [{ text: prompt }] } });
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts && parts[0]?.inlineData?.data) return `data:${parts[0].inlineData.mimeType};base64,${parts[0].inlineData.data}`;
    throw new Error("No image data");
  });
};