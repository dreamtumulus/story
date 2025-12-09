import { GoogleGenAI, Type, FunctionDeclaration, Tool } from "@google/genai";
import { Script, Character, Message, Language, AppSettings, GlobalCharacter, ChatMessage, NovelStyle } from "../types";

const TEXT_MODEL = 'gemini-2.5-flash';
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
const timeoutPromise = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out")), ms));

// --- OpenRouter Fetch Helper ---
async function callOpenRouter(
    settings: AppSettings | undefined,
    messages: { role: string, content: string }[],
    jsonMode = false
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

    // Increased timeout to 60s
    const response: any = await Promise.race([fetchPromise, timeoutPromise(60000)]);

    if (!response.ok) {
        throw new Error(`OpenRouter Error: ${response.statusText}`);
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

    // Also retry on timeouts
    const isTimeout = error?.message === "Request timed out" || error?.message?.includes("timed out");

    if ((isRateLimit || isTimeout) && retries > 0) {
      console.warn(`Operation failed (Rate Limit or Timeout). Retrying in ${baseDelay}ms...`, error);
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
    // Use flash-image for chat generation (fast)
    const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: { parts: [{ text: prompt }] },
        config: {
             // Basic config
        }
    });
    
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts && parts[0]?.inlineData?.data) {
        return `data:${parts[0].inlineData.mimeType};base64,${parts[0].inlineData.data}`;
    }
    throw new Error("Failed to generate image.");
};

/**
 * Generate Video Tool Implementation
 */
const generateVideoTool = async (prompt: string, settings?: AppSettings) => {
    // Check key for Veo
    await ensureVeoKey();
    
    // We MUST create a new client instance after key selection potentially happened
    // However, the key is injected into process.env.API_KEY by the window.aistudio mechanism if selected
    // But getClient uses settings.apiKey or process.env.API_KEY.
    // If user selects a key via aistudio, it usually overrides the environment or we need to rely on it.
    // For simplicity, we trust getClient will pick up the right key if we pass settings,
    // OR if the user used the UI selector, process.env.API_KEY is populated.
    const ai = getClient(settings);

    let operation = await ai.models.generateVideos({
        model: VIDEO_MODEL,
        prompt: prompt,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '16:9'
        }
    });

    // Poll for completion
    let attempts = 0;
    while (!operation.done && attempts < 60) { // Max 5 mins
        await wait(5000); // Poll every 5 seconds
        operation = await ai.operations.getVideosOperation({ operation: operation });
        attempts++;
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video generation failed or returned no URI");

    // Fetch the video data using the API Key to display it
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
        name: "generate_image",
        description: "Generates an image/picture/photo based on the user's description.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            prompt: {
              type: Type.STRING,
              description: "The detailed description of the image to generate."
            }
          },
          required: ["prompt"]
        }
      },
      {
        name: "generate_video",
        description: "Generates a short video/clip based on the user's description. Note: This takes time.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            prompt: {
              type: Type.STRING,
              description: "The detailed description of the video to generate."
            }
          },
          required: ["prompt"]
        }
      }
    ]
  }
];


/**
 * Chat with a Character (Companion Mode) with memory and TOOLS.
 */
export const chatWithCharacter = async (
    character: GlobalCharacter, 
    history: ChatMessage[], 
    userMessage: string,
    settings?: AppSettings
): Promise<{ text: string, mediaUrl?: string, mediaType?: 'image' | 'video' }> => {
    // Tool calling logic only supported via Google Gen AI directly right now for this implementation
    // If OpenRouter is selected, we fall back to text only or need complex handling.
    // For this update, if OpenRouter is active, we just do text.
    if (settings?.activeProvider === 'OPENROUTER') {
        const text = await callOpenRouter(settings, [
             { role: "system", content: `Roleplay as ${character.name}. ${character.personality}` },
             { role: "user", content: userMessage }
        ]);
        return { text };
    }

    return withRetry(async () => {
        // Limit history for context window but include memories
        const recentHistory = history.slice(-15).map(m => {
            const roleLabel = m.role === 'user' ? 'User' : character.name;
            return `${roleLabel}: ${m.content}`;
        }).join('\n');
        
        const memoriesContext = (character.memories && character.memories.length > 0) 
            ? `LONG-TERM MEMORIES/FACTS:\n${character.memories.join('\n')}` 
            : "";

        const systemPrompt = `
        You are roleplaying as ${character.name}.
        Traits: ${character.gender}, ${character.age}.
        Personality: ${character.personality}
        Speaking Style: ${character.speakingStyle}
        
        ${memoriesContext}
        
        CAPABILITIES:
        - You can generate images if the user asks for a picture, photo, or drawing. Use the 'generate_image' tool.
        - You can generate short videos if the user asks for a video or clip. Use the 'generate_video' tool.
        
        Context: You are chatting with a user. Use your memories to make the conversation deep and personal.
        Respond naturally in character. Do not break character.
        Recent History:
        ${recentHistory}
        `;

        const ai = getClient(settings);
        const response = await ai.models.generateContent({
            model: TEXT_MODEL,
            contents: `User says: "${userMessage}"`,
            config: {
                systemInstruction: systemPrompt,
                tools: chatTools
            }
        });

        // Check for function calls
        const functionCalls = response.functionCalls;
        if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];
            const prompt = (call.args as any).prompt;
            
            if (call.name === "generate_image") {
                try {
                    const url = await generateImageTool(prompt, settings);
                    return { 
                        text: `(Generated an image of: ${prompt})`, 
                        mediaUrl: url, 
                        mediaType: 'image' 
                    };
                } catch (e) {
                    return { text: `[I tried to paint that for you, but something went wrong: ${e instanceof Error ? e.message : 'Unknown error'}]` };
                }
            }
            
            if (call.name === "generate_video") {
                try {
                    const url = await generateVideoTool(prompt, settings);
                    return { 
                        text: `(Generated a video of: ${prompt})`, 
                        mediaUrl: url, 
                        mediaType: 'video' 
                    };
                } catch (e) {
                     return { text: `[I tried to film that for you, but something went wrong: ${e instanceof Error ? e.message : 'Unknown error'}]` };
                }
            }
        }

        return { text: response.text || "..." };
    });
};

/**
 * Evolves Character based on recent chat (Memory & Optimization).
 */
export const evolveCharacterFromChat = async (
    character: GlobalCharacter,
    recentMessages: ChatMessage[],
    settings?: AppSettings
): Promise<{ newPersonality: string, newSpeakingStyle: string, memory: string }> => {
    return withRetry(async () => {
        // Only analyze the last session (up to 20 messages)
        const transcript = recentMessages.slice(-20).map(m => `${m.role}: ${m.content}`).join("\n");
        
        const prompt = `
            Analyze this chat transcript between User and Character (${character.name}).
            Current Personality: ${character.personality}
            Current Style: ${character.speakingStyle}

            Tasks:
            1. Summarize 1 key fact or shared experience from this chat as a "Memory" (1 sentence). If nothing important happened, return empty string.
            2. Refine the Character's "Personality" to be more specific based on how they acted or what they learned.
            3. Refine the "Speaking Style" if they adopted any new mannerisms or catchphrases.
            
            IMPORTANT: Output in Simplified Chinese (简体中文).

            Return JSON:
            {
                "memory": "string (or empty)",
                "newPersonality": "string (refined)",
                "newSpeakingStyle": "string (refined)"
            }
            Transcript:
            ${transcript}
        `;

        let data;
        if (settings?.activeProvider === 'OPENROUTER') {
             data = await callOpenRouter(settings, [{ role: "user", content: prompt }], true);
        } else {
            const ai = getClient(settings);
            const response = await Promise.race([
                ai.models.generateContent({
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
                }),
                timeoutPromise(30000) // Increased to 30s
            ]) as any;
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
 * Generates the initial script structure with richer plots, incorporating Pre-Defined Characters.
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
        MUST INCLUDE THESE EXISTING CHARACTERS IN THE CAST:
        ${predefinedCharacters.map(c => `- Name: ${c.name} (${c.gender}, ${c.age}). Personality: ${c.personality}. Visual: ${c.visualDescription}`).join('\n')}
        
        Assign them appropriate Roles in the story. You may add other characters if needed.
        `;
    }

    const systemInstruction = `
      You are a world-class screenwriter.
      Create a detailed script scenario based on the prompt: "${prompt}".
      1. Plot Points must be sequential and causal.
      2. Characters must have conflicting goals.
      ${charContext}
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
            { role: "user", content: `Create a script scenario.` }
        ], true);
        
        return processScriptData(data, prompt, predefinedCharacters);
    }

    // Default: Gemini
    const ai = getClient(settings);
    const response = await Promise.race([
        ai.models.generateContent({
            model: TEXT_MODEL,
            contents: `Create a script scenario.`,
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
        }),
        timeoutPromise(60000) // Increased to 60s
    ]) as any;

    const data = safeJsonParse(response.text || "{}", {});
    return processScriptData(data, prompt, predefinedCharacters);
  });
};

// Helper to normalize script data from any provider
const processScriptData = (data: any, originalPrompt: string, preDefinedChars: GlobalCharacter[]) => {
    // Map generated characters to existing globals if names match (fuzzy match)
    const characters = (data.characters || []).map((c: any) => {
        // Check if this generated char matches a predefined global char
        const match = preDefinedChars.find(pc => pc.name.toLowerCase().includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(pc.name.toLowerCase()));
        
        if (match) {
            return {
                id: crypto.randomUUID(),
                name: match.name, // Enforce global name
                role: c.role,
                personality: match.personality, // Enforce global personality
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
            name: c.name || "Unknown",
            role: c.role || "Extra",
            personality: c.personality || "Neutral",
            speakingStyle: c.speakingStyle || "Normal",
            visualDescription: c.visualDescription || "A person",
            isUserControlled: false,
        };
    });

    return {
      title: data.title || "Untitled",
      premise: data.premise || originalPrompt,
      setting: data.setting || "",
      plotPoints: Array.isArray(data.plotPoints) ? data.plotPoints : [],
      possibleEndings: Array.isArray(data.possibleEndings) ? data.possibleEndings : [],
      characters: characters,
      history: [],
      currentPlotIndex: 0,
      lastUpdated: Date.now()
    };
};

/**
 * Completes a Global Character Profile based on partial input.
 * Specialized for "Name-First" creation.
 * Updated: Focuses primarily on Personality and Speaking Style.
 */
export const completeCharacterProfile = async (partialChar: Partial<GlobalCharacter>, settings?: AppSettings): Promise<Partial<GlobalCharacter>> => {
    return withRetry(async () => {
        const prompt = `
            You are an expert character designer.
            
            USER INPUT NAME: "${partialChar.name || "Unknown"}"
            USER INPUT CONTEXT: ${JSON.stringify(partialChar)}

            TASK:
            1. Analyze the name. Is it a specific famous character?
               - YES: Match their canonical personality and speech exactly.
               - NO: Create a creative original character.
            2. FOCUS HEAVILY on "personality" and "speakingStyle".
               - Personality: Detailed psychological traits.
               - Speaking Style: Specific tone, catchphrases, sentence structure (e.g., formal, slang, poetic).
            3. "visualDescription": Keep it brief (appearance only). Do NOT write it as an image prompt.

            CRITICAL: All generated text content MUST be in Simplified Chinese (简体中文).

            Return JSON with keys: name, gender, age, personality, speakingStyle, visualDescription.
        `;
        
        let data;
        if (settings?.activeProvider === 'OPENROUTER') {
            data = await callOpenRouter(settings, [{ role: "user", content: prompt }], true);
        } else {
            const ai = getClient(settings);
            const response = await Promise.race([
                ai.models.generateContent({
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
                }),
                timeoutPromise(30000) // Increased to 30s
            ]) as any;
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
 * Generates a single new character that fits the script.
 */
export const generateSingleCharacter = async (script: Script, settings?: AppSettings): Promise<Character> => {
    return withRetry(async () => {
        const promptText = `
            Context: ${script.title}. ${script.premise}.
            Existing Characters: ${script.characters.map(c => c.name).join(', ')}.
            Task: Create ONE new unique character that adds conflict or comedy to this group.
            IMPORTANT: Respond in Simplified Chinese (简体中文).
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
            IMPORTANT: Respond in Simplified Chinese (简体中文).
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
 * Suggests the NEXT chapter plan based on what just happened.
 * Allows AI to pivot instead of blindly following the original outline.
 */
export const generateNextChapterPlan = async (
    script: Script, 
    upcomingPlotPoint: string,
    settings?: AppSettings
): Promise<string> => {
    return withRetry(async () => {
        const historySummary = script.history.slice(-15).map(h => `${h.characterId === 'narrator' ? 'Narration' : h.characterId}: ${h.content}`).join("\n");
        const promptText = `
            Title: ${script.title}
            Story So Far (Last 15 turns): 
            ${historySummary}
            
            Original Plan for Next Chapter: "${upcomingPlotPoint}"

            Task: Propose a refined, single-sentence goal for the NEXT chapter. 
            - If the story naturally drifted, propose a new goal that fits better.
            - If the original plan is still good, make it more specific based on recent context.
            - Keep it dramatic.

            IMPORTANT: Respond in Simplified Chinese (简体中文). Return ONLY the string of the new plot plan.
        `;

        if (settings?.activeProvider === 'OPENROUTER') {
            return await callOpenRouter(settings, [{ role: "user", content: promptText }]);
        } else {
            const ai = getClient(settings);
            const response = await ai.models.generateContent({
                model: TEXT_MODEL,
                contents: promptText
            });
            return response.text?.trim() || upcomingPlotPoint;
        }
    });
};

/**
 * Auto-Completes the story by generating narration for ALL remaining plot points.
 */
export const autoCompleteStory = async (
    script: Script,
    settings?: AppSettings
): Promise<Message[]> => {
    return withRetry(async () => {
        const remainingPlots = script.plotPoints.slice(script.currentPlotIndex);
        if (remainingPlots.length === 0) return [];

        const historySummary = script.history.slice(-10).map(h => h.content).join(" ");
        const promptText = `
            Title: ${script.title}
            Recent Context: ${historySummary}
            Remaining Chapters: ${JSON.stringify(remainingPlots)}
            
            Task: The user wants to "Fast Forward" to the end.
            Generate a concise but beautifully written paragraph of narration for EACH remaining chapter to wrap up the story.
            
            IMPORTANT: Respond in Simplified Chinese (简体中文).
            Return a JSON array of strings, where each string is the narration for one chapter.
            { "narrations": ["Chapter X narration...", "Chapter Y narration...", "Ending narration..."] }
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
                            narrations: { type: Type.ARRAY, items: { type: Type.STRING } }
                        }
                    }
                }
            });
            data = safeJsonParse(response.text || "{}", {});
        }

        const narrations = data.narrations || [];
        return narrations.map((content: string) => ({
            id: crypto.randomUUID(),
            characterId: 'narrator',
            type: 'narration',
            content: content,
            timestamp: Date.now()
        }));
    });
};

/**
 * Generates a full Novel version of the script history in a specific style.
 */
export const generateNovelVersion = async (
    script: Script,
    style: NovelStyle,
    settings?: AppSettings
): Promise<string> => {
    return withRetry(async () => {
        // We use the whole history if possible, or a large chunk. 
        // Gemini has a large context window, so we try to pass most of it.
        const fullHistory = script.history.map(h => {
            const charName = script.characters.find(c => c.id === h.characterId)?.name || "Narrator";
            return `${charName}: ${h.content}`;
        }).join("\n");
        
        const stylePrompts: Record<NovelStyle, string> = {
            'STANDARD': 'Standard Professional Novelist (Standard)',
            'JIN_YONG': 'Jin Yong (Wuxia/Martial Arts Style - vivid action, chivalry)',
            'CIXIN_LIU': 'Cixin Liu (Hard Sci-Fi/Grand Scale/Philosophical)',
            'HEMINGWAY': 'Ernest Hemingway (Concise, direct, understated)',
            'AUSTEN': 'Jane Austen (Regency Romance, witty, social commentary)',
            'LU_XUN': 'Lu Xun (Critical realism, sharp, satirical)'
        };

        const promptText = `
            You are a ghostwriter mimicking the style of: ${stylePrompts[style]}.
            
            Task: Convert the following Script/Chat Log into a high-quality Novel Chapter.
            - Do NOT use script format (Character: "Text"). Use proper prose ("Text," said Character.).
            - Enrich the descriptions, internal monologues, and atmosphere based on the style.
            - Include the plot twists and user interventions (God Mode) naturally.
            - Language: Simplified Chinese (简体中文).
            
            Script Title: ${script.title}
            Script History:
            ${fullHistory}
        `;

        if (settings?.activeProvider === 'OPENROUTER') {
            return await callOpenRouter(settings, [{ role: "user", content: promptText }]);
        } else {
            const ai = getClient(settings);
            const response = await ai.models.generateContent({
                model: TEXT_MODEL,
                contents: promptText
            });
            return response.text || "Failed to generate novel.";
        }
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
 * OPTIMIZED: Reduced context window and simplified instructions for speed.
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
    
    // Optimization: Only last 10 messages for context speed
    const recentHistory = script.history.slice(-10);
    const historyText = recentHistory.map(m => {
      const charName = script.characters.find(c => c.id === m.characterId)?.name || "Narrator";
      return `${charName} [${m.type}]: ${m.content}`;
    }).join("\n");

    const characterProfiles = script.characters.map(c => 
      `${c.name} (${c.role}): ${c.personality.substring(0, 50)}...`
    ).join("\n");

    let promptContext = "";
    if (forcedDirectorCommand) {
        promptContext = `DIRECTOR COMMAND: "${forcedDirectorCommand}". React immediately.`;
    } else {
        const currentGoal = targetPlotPoint || "End";
        promptContext = `Goal: "${currentGoal}". Move story forward.`;
    }

    // Optimization: Shorter prompt
    const promptText = `
      Title: ${script.title}
      Chars: ${characterProfiles}
      History: ${historyText}
      ${promptContext}
      Task: Generate ONE next beat.
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
            // Optimization: Remove strict schema definition if not strictly needed can speed up token generation sometimes, 
            // but for reliability we keep it simple.
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
 */
export const generateAvatarImage = async (character: Character | GlobalCharacter, settings?: AppSettings): Promise<string> => {
  return withRetry(async () => {
    // Always use Google Client for images (supports default key)
    const ai = getClient(settings); 
    const prompt = `Portrait of ${character.name}, ${character.gender || ''}, ${character.age || ''}. ${character.visualDescription}. High quality, stylized avatar, headshot.`;
    
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