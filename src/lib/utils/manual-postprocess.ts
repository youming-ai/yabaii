/** * 手动触发后Process工具函数 * Used foras已Transcription但没有TranslationFile生成Translation*/

import { db } from "@/lib/db/db";

interface PostProcessOptions {
  transcriptId: number;
  sourceLanguage?: string; // Audio原始Language，默认 "ja"
  targetLanguage?: string; // Translation目标Language，默认 "zh-CN"
}

/** * 手动触发后Process * Used foras现有Transcription生成Translation*/
export async function manualPostProcess(options: PostProcessOptions): Promise<boolean> {
  const { transcriptId, sourceLanguage = "ja", targetLanguage = "zh-CN" } = options;

  console.log(`🔄 手动后处理开始，transcriptId: ${transcriptId}`);
  console.log(`   源语言: ${sourceLanguage}, 目标语言: ${targetLanguage}`);

  try {
    // Get segments
    const segments = await db.segments.where("transcriptId").equals(transcriptId).toArray();

    if (segments.length === 0) {
      console.error("❌ 没有找到 segments");
      return false;
    }

    console.log(`📝 找到 ${segments.length} 个 segments`);

    // 调用后Process API
    const response = await fetch("/api/postprocess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        segments: segments.map((s) => ({
          text: s.text,
          start: s.start,
          end: s.end,
        })),
        language: sourceLanguage,
        targetLanguage: targetLanguage,
        enableAnnotations: true,
        enableFurigana: sourceLanguage === "ja",
      }),
    });

    if (!response.ok) {
      console.error(`❌ 后处理 API 失败: ${response.status} ${response.statusText}`);
      return false;
    }

    const result = await response.json();
    console.log("📦 后处理 API 响应:", {
      success: result.success,
      segmentCount: result.data?.segments?.length,
    });

    if (!result.success || !result.data?.segments) {
      console.error("❌ 后处理响应无效:", result);
      return false;
    }

    // Updatedatabasein segments
    let updatedCount = 0;
    for (const processedSegment of result.data.segments) {
      const count = await db.segments
        .where("transcriptId")
        .equals(transcriptId)
        .and(
          (segment) =>
            segment.start === processedSegment.start && segment.end === processedSegment.end,
        )
        .modify({
          normalizedText: processedSegment.normalizedText,
          translation: processedSegment.translation,
          annotations: processedSegment.annotations,
          furigana: processedSegment.furigana,
        });
      updatedCount += count;
    }

    console.log(`✅ 后处理完成，更新了 ${updatedCount} 个 segments`);
    console.log("🔄 请刷新页面查看翻译");

    return true;
  } catch (error) {
    console.error("❌ 后处理异常:", error);
    return false;
  }
}

// 导出To window object，方便在浏览器控制台调用
if (typeof window !== "undefined") {
  (window as any).manualPostProcess = manualPostProcess;
}
