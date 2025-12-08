import Groq from "groq-sdk";

interface PostProcessOptions {
  language?: string;
}

interface ProcessedText {
  originalText: string;
  processedText: string;
  romaji?: string;
  chineseTranslation?: string;
  segments: Array<{
    text: string;
    romaji?: string;
    chineseTranslation?: string;
    start: number;
    end: number;
  }>;
}

// AI SDK 使用内置优化配置，无需手动管理client

/** * 使用 openai/gpt-oss-20b 模型对文本进行后Process * Add romaji 和in文Translation*/
export async function postProcessText(
  inputText: string,
  _options: PostProcessOptions = {},
): Promise<ProcessedText> {
  // Checkis否在浏览器环境in
  if (typeof window === "undefined") {
    throw new Error("文本处理功能只能在浏览器环境中使用");
  }

  try {
    const prompt = `请对以下日语文本进行处理，为每段文本添加：
1. 罗马音注音 (romaji)
2. 中文翻译

请以JSON格式返回，格式如下：
{
  "segments": [
    {
      "text": "原始日语文本",
      "romaji": "罗马音注音",
      "chineseTranslation": "中文翻译",
      "start": 0,
      "end": 2.5
    }
  ]
}

文本内容：
${inputText}`;

    // 使用 Groq SDK 进行文本Process
    const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const response = await groqClient.chat.completions.create({
      model: "openai/gpt-oss-20b",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "你是一个专业的日语文本处理助手，专门为日语学习材料添加罗马音和中文翻译。请严格按照JSON格式返回结果。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText = response.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error("未收到有效的响应内容");
    }

    try {
      const result = JSON.parse(responseText);
      return {
        originalText: inputText,
        processedText: inputText,
        segments: result.segments || [],
      };
    } catch {
      throw new Error("解析处理结果失败");
    }
  } catch (error) {
    throw new Error(`文本处理失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

/** * ProcessTranscription后完整Audio片段*/
export async function postProcessTranscription(
  segments: Array<{
    text: string;
    start: number;
    end: number;
  }>,
  options: PostProcessOptions = {},
): Promise<ProcessedText> {
  const fullText = segments.map((seg) => seg.text).join("\n");

  try {
    const processed = await postProcessText(fullText, options);

    // 将Process结果映射回原始时间段
    const enrichedSegments = segments.map((segment, index) => {
      const processedSegment = processed.segments[index];
      return {
        text: segment.text,
        romaji: processedSegment?.romaji,
        chineseTranslation: processedSegment?.chineseTranslation,
        start: segment.start,
        end: segment.end,
      };
    });

    return {
      originalText: fullText,
      processedText: fullText,
      segments: enrichedSegments,
    };
  } catch {
    // 返回未Process原始结果
    return {
      originalText: fullText,
      processedText: fullText,
      segments: segments.map((seg) => ({
        ...seg,
        romaji: undefined,
        chineseTranslation: undefined,
      })),
    };
  }
}
