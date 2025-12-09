import { GoogleGenAI, Type, FunctionDeclaration, Tool } from "@google/genai";
import { Script, Character, Message, Language, AppSettings, GlobalCharacter, ChatMessage, NovelStyle } from "../types";

// --- 模型常量定义 ---
const TEXT_MODEL = 'gemini-2.5-flash';
const IMAGE_MODEL = 'gemini-2.5-flash-image';
const VIDEO_MODEL = 'veo-3.1-fast-generate-preview';
const DEFAULT_GEMINI_KEY = 'AIzaSyC6zQSEAAdLRgOMR6_CwQ1sSNVur0_vpW0';

// --- 超时设置 ---
// 针对不同任务设置不同的超时时间，避免长任务被前端截断
const STANDARD_TIMEOUT = 60000; // 标准交互 60秒
const HEAVY_TASK_TIMEOUT = 180000; // 重型任务 (写小说/生成大纲) 3分钟

// --- UUID Polyfill ---
// 防止在非安全上下文(非HTTPS)下 crypto.randomUUID 崩溃
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
// 防止在某些构建环境(如Vercel Edge)下 process is not defined 导致崩溃
const getEnvVar = (key: string): string | undefined => {
    try {
        // 检查标准 Node/Webpack process.env
        if (typeof process !== 'undefined' && process.env) {
            return process.env[key];
        }
    } catch (e) {}
    
    try {
        // 检查 Vite import.meta.env
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            // @ts-ignore
            return import.meta.env[key];
        }
    } catch (e) {}
    
    return undefined;
};

// --- 获取有效的 API Key ---
const getGeminiKey = (settings?: AppSettings) => {
    return settings?.apiKey || getEnvVar('API_KEY') || DEFAULT_GEMINI_KEY;
};

// --- 获取 Gemini 客户端实例 ---
const getClient = (settings?: AppSettings) => {
    const apiKey = getGeminiKey(settings);
    if (!apiKey) throw new Error("No API Key");
    return new GoogleGenAI({ apiKey });
};

// --- 超时 Promise 辅助函数 ---
const timeoutPromise = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out")), ms));

// --- OpenRouter 调用辅助函数 ---
// 用于支持除 Gemini 之外的模型 (如果用户配置了)
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

// --- 重试逻辑辅助函数 ---
// 处理 429 限流或超时错误，自动重试
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

    // 同时重试超时错误
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
 * 健壮的 JSON 解析器
 * 修复部分模型输出Markdown代码块 (```json) 导致解析失败的问题
 */
const safeJsonParse = <T>(text: string, fallback: T): T => {
  if (!text) return fallback;
  try {
    let clean = text.trim();
    // 移除 markdown 代码块标记
    clean = clean.replace(/```json/g, '').replace(/```/g, '');
    // 截取第一个 { 到最后一个 } 之间的内容，去除首尾无关字符
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
 * 检查并请求 Veo 视频生成权限 (API Key)
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
 * 工具函数：生成图片
 */
const generateImageTool = async (prompt: string, settings?: AppSettings) => {
    const ai = getClient(settings);
    // 使用 flash-image 进行快速生成
    const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: { parts: [{ text: prompt }] },
        config: {
             // 基础配置
        }
    });
    
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts && parts[0]?.inlineData?.data) {
        return `data:${parts[0].inlineData.mimeType};base64,${parts[0].inlineData.data}`;
    }
    throw new Error("Failed to generate image.");
};

/**
 * 工具函数：生成视频 (调用 Veo 模型)
 */
const generateVideoTool = async (prompt: string, settings?: AppSettings) => {
    // 必须确保 Veo Key 已选择
    await ensureVeoKey();
    
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

    // 轮询等待视频生成完成 (Veo 生成需要时间)
    let attempts = 0;
    while (!operation.done && attempts < 60) { // 最多等待 5 分钟
        await wait(5000); // 每 5 秒轮询一次
        operation = await ai.operations.getVideosOperation({ operation: operation });
        attempts++;
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video generation failed or returned no URI");

    // 使用 API Key 获取视频二进制数据
    const apiKey = getGeminiKey(settings);
    const fetchUrl = `${videoUri}&key=${apiKey}`;
    
    const res = await fetch(fetchUrl);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
};

// --- 聊天工具定义 (Function Calling) ---
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
 * 核心功能：与角色聊天 (陪伴模式)
 * 支持工具调用 (生成图片/视频) 和 长期记忆注入
 */
export const chatWithCharacter = async (
    character: GlobalCharacter, 
    history: ChatMessage[], 
    userMessage: string,
    settings?: AppSettings
): Promise<{ text: string, mediaUrl?: string, mediaType?: 'image' | 'video' }> => {
    // 如果使用 OpenRouter，目前降级为纯文本，因为工具调用协议不同
    if (settings?.activeProvider === 'OPENROUTER') {
        const text = await callOpenRouter(settings, [
             { role: "system", content: `Roleplay as ${character.name}. ${character.personality}` },
             { role: "user", content: userMessage }
        ]);
        return { text };
    }

    return withRetry(async () => {
        // 限制上下文窗口 (最近15条)，但注入长期记忆
        const recentHistory = history.slice(-15).map(m => {
            const roleLabel = m.role === 'user' ? 'User' : character.name;
            return `${roleLabel}: ${m.content}`;
        }).join('\n');
        
        // 注入长期记忆
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

        // 检查是否有函数调用 (Function Calls)
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
 * 角色进化逻辑
 * 分析最近的聊天记录，提取记忆，并微调角色的性格和语言风格
 */
export const evolveCharacterFromChat = async (
    character: GlobalCharacter,
    recentMessages: ChatMessage[],
    settings?: AppSettings
): Promise<{ newPersonality: string, newSpeakingStyle: string, memory: string }> => {
    return withRetry(async () => {
        // 仅分析最近的会话 (最多20条)
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
                timeoutPromise(30000) // 超时设置 30s
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
 * 生成剧本蓝图 (Script Blueprint)
 * 根据用户的一句话灵感，扩展成完整的世界观、角色表和分章节大纲。
 * 使用了策略模式 (Strategy Pattern) 来支持 OpenRouter。
 */
export const generateScriptBlueprint = async (
    prompt: string, 
    predefinedCharacters: GlobalCharacter[] = [],
    lang: Language = 'zh-CN', 
    settings?: AppSettings
): Promise<Partial<Script>> => {
  return withRetry(async () => {
    const langInstruction = lang === 'zh-CN' ? "Respond entirely in Simplified Chinese." : "Respond in English.";
    
    // 构建预设角色上下文，确保 AI 在剧本中包含用户选中的角色
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
      
      CRITICAL RULES:
      1. Plot Points must be SEQUENTIAL and CAUSALLY LINKED (Scene by Scene).
      2. Ensure the story has a clear beginning, middle, and end.
      3. Characters must have conflicting goals.
      
      ${charContext}
      ${langInstruction}
    `;

    // 策略模式: 检查是否使用 OpenRouter
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
        ], true, HEAVY_TASK_TIMEOUT);
        
        return processScriptData(data, prompt, predefinedCharacters);
    }

    // 默认: Gemini API
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
        timeoutPromise(HEAVY_TASK_TIMEOUT) // 增加到 180s
    ]) as any;

    const data = safeJsonParse(response.text || "{}", {});
    return processScriptData(data, prompt, predefinedCharacters);
  });
};

// 辅助函数：标准化剧本数据，处理生成的角色与预设角色的合并
const processScriptData = (data: any, originalPrompt: string, preDefinedChars: GlobalCharacter[]) => {
    // 健壮性检查
    const rawChars = Array.isArray(data.characters) ? data.characters : [];
    
    // 将生成的角色映射回全局角色 (如果名称匹配)，保持 ID 一致性
    const characters = rawChars.map((c: any) => {
        // 模糊匹配名称
        const match = preDefinedChars.find(pc => pc.name.toLowerCase().includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(pc.name.toLowerCase()));
        
        if (match) {
            return {
                id: generateId(), // 新的剧本内 ID
                name: match.name, // 强制使用全局名称
                role: c.role || "Role",
                personality: match.personality, // 强制使用全局性格
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
            id: generateId(), // Safe UUID
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
 * 补全角色档案 (Magic Fill)
 * 专为 "先输入名字" 的创建流程设计。
 * 会识别名人/动漫角色，并自动填补性格和语言风格。
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
                timeoutPromise(30000) // 增加到 30s
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
 * 自动生成一个新配角，用于丰富当前剧本。
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
            id: generateId(),
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
 * 上帝模式 (God Mode) 重构未来剧情
 * 根据用户的突发指令 (Director Command) 重新规划后续的所有剧情节点。
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

        return Array.isArray(data.newPlotPoints) ? data.newPlotPoints : script.plotPoints;
    });
};

/**
 * 策划下一章节 (Next Chapter Plan)
 * 根据当前的演绎进度，AI 提议下一章的具体目标。允许用户在进入下一章前进行干预。
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
 * 快速完结故事 (Fast Forward)
 * AI 为剩余的每一个章节生成一段旁白总结，快速推进到结局。
 * 使用 HEAVY_TASK_TIMEOUT 防止超时。
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
            data = await callOpenRouter(settings, [{ role: "user", content: promptText }], true, HEAVY_TASK_TIMEOUT);
        } else {
            const ai = getClient(settings);
            const response = await Promise.race([
                ai.models.generateContent({
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
                }),
                timeoutPromise(HEAVY_TASK_TIMEOUT) // 3 分钟
            ]) as any;
            data = safeJsonParse(response.text || "{}", {});
        }

        // 安全检查：确保是数组，防止UI崩溃
        const narrations = (data && Array.isArray(data.narrations)) ? data.narrations : [];
        
        return narrations.map((content: string) => ({
            id: generateId(),
            characterId: 'narrator',
            type: 'narration',
            content: content,
            timestamp: Date.now()
        }));
    });
};

/**
 * 生成小说版本 (Novel Export)
 * 将剧本的对话和动作历史，重写为指定风格的散文小说。
 */
export const generateNovelVersion = async (
    script: Script,
    style: NovelStyle,
    settings?: AppSettings
): Promise<string> => {
    return withRetry(async () => {
        // 尽可能传入全部历史
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
            return await callOpenRouter(settings, [{ role: "user", content: promptText }], false, HEAVY_TASK_TIMEOUT);
        } else {
            const ai = getClient(settings);
            const response = await Promise.race([
                ai.models.generateContent({
                    model: TEXT_MODEL,
                    contents: promptText
                }),
                timeoutPromise(HEAVY_TASK_TIMEOUT) // 3 分钟
            ]) as any;
            return response.text || "Failed to generate novel.";
        }
    });
};

/**
 * 文本润色 (AI Refine)
 * 优化用户输入的一段文字，使其更具戏剧性。
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
 * 生成下一个剧情节拍 (Generate Next Beat)
 * 游戏循环的核心。决定下一个说话的角色、内容或旁白。
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
    
    // 优化：仅取最近 10 条历史以加快推理速度
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
            // 优化：移除严格的Schema定义有时能加快Token生成
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
 * 生成头像
 */
export const generateAvatarImage = async (character: Character | GlobalCharacter, settings?: AppSettings): Promise<string> => {
  return withRetry(async () => {
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
 * 生成场景插图 (Scene Illustration)
 */
export const generateSceneImage = async (sceneDescription: string, scriptTitle: string, settings?: AppSettings): Promise<string> => {
  return withRetry(async () => {
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