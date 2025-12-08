/** * FileValidate工具class * 提供深度FileValidatefunctionality，包括File头检测、内容Validate和安全性Check*/

export interface ValidationError {
  code: string;
  message: string;
  severity: "error" | "warning" | "info";
  field?: string;
  details?: Record<string, unknown>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  info: ValidationError[];
  fileType?: string;
  fileSize?: number;
  audioProperties?: AudioProperties;
  securityScore?: number;
}

export interface AudioProperties {
  duration?: number;
  sampleRate?: number;
  channels?: number;
  bitRate?: number;
  codec?: string;
  format?: string;
}

export interface FileSignature {
  magicNumber: number[];
  mimeType: string;
  extensions: string[];
  offset?: number;
}

/** * 支持AudioFile签名*/
const AUDIO_FILE_SIGNATURES: FileSignature[] = [
  // MP3
  {
    magicNumber: [0x49, 0x44, 0x33], // 'ID3'
    mimeType: "audio/mpeg",
    extensions: ["mp3"],
    offset: 0,
  },
  {
    magicNumber: [0xff, 0xfb], // MPEG 1 Layer 3
    mimeType: "audio/mpeg",
    extensions: ["mp3"],
    offset: 0,
  },
  {
    magicNumber: [0xff, 0xfa], // MPEG 2 Layer 3
    mimeType: "audio/mpeg",
    extensions: ["mp3"],
    offset: 0,
  },
  {
    magicNumber: [0xff, 0xf3], // MPEG 2.5 Layer 3
    mimeType: "audio/mpeg",
    extensions: ["mp3"],
    offset: 0,
  },
  {
    magicNumber: [0xff, 0xf2], // MPEG 2.5 Layer 3
    mimeType: "audio/mpeg",
    extensions: ["mp3"],
    offset: 0,
  },
  // WAV
  {
    magicNumber: [0x52, 0x49, 0x46, 0x46], // 'RIFF'
    mimeType: "audio/wav",
    extensions: ["wav"],
    offset: 0,
  },
  // FLAC
  {
    magicNumber: [0x66, 0x4c, 0x61, 0x43], // 'fLaC'
    mimeType: "audio/flac",
    extensions: ["flac"],
    offset: 0,
  },
  // OGG
  {
    magicNumber: [0x4f, 0x67, 0x67, 0x53], // 'OggS'
    mimeType: "audio/ogg",
    extensions: ["ogg", "oga"],
    offset: 0,
  },
  // AAC (ADTS format)
  {
    magicNumber: [0xff, 0xf1], // AAC ADTS
    mimeType: "audio/aac",
    extensions: ["aac"],
    offset: 0,
  },
  {
    magicNumber: [0xff, 0xf9], // AAC ADTS
    mimeType: "audio/aac",
    extensions: ["aac"],
    offset: 0,
  },
  // M4A/AAC (MP4 container)
  {
    magicNumber: [0x66, 0x74, 0x79, 0x70], // 'ftyp' in MP4
    mimeType: "audio/mp4",
    extensions: ["m4a", "aac"],
    offset: 4,
  },
];

/** * 恶意File模式检测*/
const MALICIOUS_PATTERNS = [
  // 可执行File头
  [0x4d, 0x5a], // MZ - PE executable
  [0x7f, 0x45, 0x4c, 0x46], // ELF executable
  [0xfe, 0xed, 0xfa, 0xcf], // Mach-O executable
  [0xce, 0xfa, 0xed, 0xfe], // Mach-O universal binary

  // 脚本File标记
  [0x3c, 0x21, 0x2d, 0x2d], // <!--
  [0x3c, 0x73, 0x63, 0x72], // <scr
  [0x3c, 0x68, 0x74, 0x6d], // <htm
  [0x23, 0x21, 0x2f, 0x62], // #!/b
  [0x23, 0x21, 0x2f, 0x75], // #!/u

  // 压缩File头（可能包含恶意内容）
  [0x50, 0x4b, 0x03, 0x04], // ZIP
  [0x50, 0x4b, 0x05, 0x06], // ZIP (empty)
  [0x50, 0x4b, 0x07, 0x08], // ZIP (spanned)
  [0x1f, 0x8b, 0x08], // GZIP
];

/** * readFile头Used for签名检测*/
async function readFileHeader(file: File, bytesToRead: number = 32): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file header"));
      }
    };

    reader.onerror = () => {
      reject(new Error("Error reading file header"));
    };

    reader.readAsArrayBuffer(file.slice(0, Math.min(bytesToRead, file.size)));
  });
}

/** * ThroughFile头检测实际Fileclass型*/
export async function detectFileType(file: File): Promise<{ type: string; confidence: number }> {
  try {
    const header = await readFileHeader(file);
    const headerArray = new Uint8Array(header);

    // Check恶意File模式
    for (const pattern of MALICIOUS_PATTERNS) {
      if (headerArray.length >= pattern.length) {
        const matches = pattern.every((byte, index) => headerArray[index] === byte);
        if (matches) {
          return { type: "malicious", confidence: 1.0 };
        }
      }
    }

    // CheckAudioFile签名
    for (const signature of AUDIO_FILE_SIGNATURES) {
      const offset = signature.offset || 0;
      if (headerArray.length >= offset + signature.magicNumber.length) {
        const matches = signature.magicNumber.every(
          (byte, index) => headerArray[offset + index] === byte,
        );

        if (matches) {
          // 对于某些格式，需要额外Validate
          if (signature.mimeType === "audio/wav") {
            // WAV File需要Validate RIFF + WAVE
            if (headerArray.length >= 12) {
              const waveHeader = new TextDecoder().decode(headerArray.slice(8, 12));
              if (waveHeader !== "WAVE") {
                continue;
              }
            }
          }

          return { type: signature.mimeType, confidence: 1.0 };
        }
      }
    }

    // Checkis否i纯文本File
    const isText = isTextFile(headerArray);
    if (isText) {
      return { type: "text/plain", confidence: 0.8 };
    }

    return { type: "unknown", confidence: 0.5 };
  } catch (_error) {
    return { type: "error", confidence: 0 };
  }
}

/** * Checkis否i文本File*/
function isTextFile(header: Uint8Array): boolean {
  // 简单文本File检测 - 大部分字节应该i可打印字符
  let textCount = 0;
  for (let i = 0; i < Math.min(header.length, 32); i++) {
    const byte = header[i];
    if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) {
      textCount++;
    }
  }
  return textCount > header.length * 0.8;
}

/** * ValidateFile扩展名和实际class型i否匹配*/
export function validateExtensionMatch(file: File, detectedType: string): ValidationError | null {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";

  // 查找支持该扩展名 MIME class型
  const expectedTypes = AUDIO_FILE_SIGNATURES.filter((sig) =>
    sig.extensions.includes(extension),
  ).map((sig) => sig.mimeType);

  if (expectedTypes.length === 0) {
    return {
      code: "UNSUPPORTED_EXTENSION",
      message: `不支持的文件扩展名: .${extension}`,
      severity: "error",
      field: "extension",
    };
  }

  if (!expectedTypes.includes(detectedType)) {
    return {
      code: "EXTENSION_MISMATCH",
      message: `文件扩展名.${extension}与实际文件类型${detectedType}不匹配`,
      severity: "warning",
      field: "extension",
      details: {
        extension,
        detectedType,
        expectedTypes,
      },
    };
  }

  return null;
}

/** * 使用 Web Audio API ValidateAudioFile*/
export async function validateAudioContent(file: File): Promise<AudioProperties | ValidationError> {
  try {
    const audioContextClass =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext;

    if (!audioContextClass) {
      return {
        code: "AUDIO_CONTEXT_UNAVAILABLE",
        message: "当前环境不支持音频验证",
        severity: "error",
        field: "content",
      };
    }

    const audioContext = new audioContextClass();

    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;

          if (!arrayBuffer || arrayBuffer.byteLength === 0) {
            resolve({
              code: "EMPTY_AUDIO",
              message: "音频文件为空",
              severity: "error",
              field: "content",
            });
            return;
          }

          // 尝试解码Audio
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

          const properties: AudioProperties = {
            duration: audioBuffer.duration,
            sampleRate: audioBuffer.sampleRate,
            channels: audioBuffer.numberOfChannels,
            format: file.type,
            bitRate: Math.round((file.size * 8) / audioBuffer.duration / 1000), // 估算比特率
          };

          // ValidateAudioproperty
          const errors: ValidationError[] = [];

          if (audioBuffer.duration <= 0) {
            errors.push({
              code: "INVALID_DURATION",
              message: "音频时长无效",
              severity: "error",
              field: "duration",
            });
          }

          if (audioBuffer.duration > 7200) {
            // 2hours限制
            errors.push({
              code: "AUDIO_TOO_LONG",
              message: "音频文件过长，最大支持2小时",
              severity: "warning",
              field: "duration",
              details: { duration: audioBuffer.duration },
            });
          }

          if (audioBuffer.sampleRate < 8000 || audioBuffer.sampleRate > 192000) {
            errors.push({
              code: "INVALID_SAMPLE_RATE",
              message: "音频采样率不在有效范围内 (8kHz - 192kHz)",
              severity: "warning",
              field: "sampleRate",
              details: { sampleRate: audioBuffer.sampleRate },
            });
          }

          if (audioBuffer.numberOfChannels > 2) {
            errors.push({
              code: "TOO_MANY_CHANNELS",
              message: "音频声道数过多，最多支持立体声",
              severity: "warning",
              field: "channels",
              details: { channels: audioBuffer.numberOfChannels },
            });
          }

          if (errors.length > 0) {
            resolve(errors[0]); // 返回第一个Error
          } else {
            resolve(properties);
          }
        } catch (error) {
          resolve({
            code: "AUDIO_DECODE_ERROR",
            message: "音频文件解码失败，文件可能已损坏或格式不支持",
            severity: "error",
            field: "content",
            details: {
              error: error instanceof Error ? error.message : "Unknown error",
            },
          });
        } finally {
          await audioContext.close();
        }
      };

      reader.onerror = () => {
        resolve({
          code: "FILE_READ_ERROR",
          message: "读取文件失败",
          severity: "error",
          field: "file",
        });
      };

      // 限制readsize以避免Memory问题
      const maxSize = 50 * 1024 * 1024; // 50MB
      const readSize = Math.min(file.size, maxSize);
      reader.readAsArrayBuffer(file.slice(0, readSize));
    });
  } catch (error) {
    return {
      code: "AUDIO_CONTEXT_ERROR",
      message: "无法创建音频上下文，浏览器可能不支持音频解码",
      severity: "error",
      field: "browser",
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

/** * 安全性Check*/
export async function performSecurityChecks(
  file: File,
): Promise<{ score: number; issues: ValidationError[] }> {
  const issues: ValidationError[] = [];
  let score = 100;

  // CheckFile名安全性
  const fileNameIssues = checkFileNameSecurity(file.name);
  issues.push(...fileNameIssues);
  score -= fileNameIssues.length * 10;

  // CheckFile内容安全性
  const contentIssues = await checkFileContentSecurity(file);
  issues.push(...contentIssues);
  score -= contentIssues.length * 20;

  // CheckFilesize
  if (file.size > 100 * 1024 * 1024) {
    // 100MB
    issues.push({
      code: "FILE_TOO_LARGE",
      message: "文件过大，存在安全风险",
      severity: "error",
      field: "size",
    });
    score -= 30;
  }

  // CheckFileclass型安全性
  const typeIssues = await checkFileTypeSecurity(file);
  issues.push(...typeIssues);
  score -= typeIssues.length * 15;

  return {
    score: Math.max(0, score),
    issues,
  };
}

/** * CheckFile名安全性*/
function checkFileNameSecurity(fileName: string): ValidationError[] {
  const issues: ValidationError[] = [];

  // Checkpath遍历
  if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
    issues.push({
      code: "PATH_TRAVERSAL",
      message: "文件名包含路径遍历字符",
      severity: "error",
      field: "filename",
    });
  }

  // Check特殊字符
  const specialChars = /[<>:"|?*]/;
  if (specialChars.test(fileName)) {
    issues.push({
      code: "INVALID_FILENAME",
      message: "文件名包含无效字符",
      severity: "warning",
      field: "filename",
    });
  }

  // CheckFile名长度
  if (fileName.length > 255) {
    issues.push({
      code: "FILENAME_TOO_LONG",
      message: "文件名过长",
      severity: "warning",
      field: "filename",
    });
  }

  return issues;
}

/** * CheckFile内容安全性*/
async function checkFileContentSecurity(file: File): Promise<ValidationError[]> {
  const issues: ValidationError[] = [];

  try {
    const header = await readFileHeader(file, 1024);
    const headerArray = new Uint8Array(header);
    const headerText = new TextDecoder().decode(headerArray).toLowerCase();

    // Check潜在恶意内容
    const maliciousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
      /eval\(/i,
      /document\./i,
      /window\./i,
      /alert\(/i,
      /function\s*\(/i,
    ];

    for (const pattern of maliciousPatterns) {
      if (pattern.test(headerText)) {
        issues.push({
          code: "MALICIOUS_CONTENT",
          message: "文件包含潜在的恶意脚本内容",
          severity: "error",
          field: "content",
        });
        break;
      }
    }

    // Check可执行代码模式
    const executablePatterns = [
      /bin\/sh/i,
      /cmd\.exe/i,
      /powershell/i,
      /\/bin\/bash/i,
      /system\(/i,
      /exec\(/i,
      /shell_exec/i,
    ];

    for (const pattern of executablePatterns) {
      if (pattern.test(headerText)) {
        issues.push({
          code: "EXECUTABLE_CODE",
          message: "文件包含可执行代码模式",
          severity: "error",
          field: "content",
        });
        break;
      }
    }
  } catch (_error) {
    issues.push({
      code: "CONTENT_SCAN_ERROR",
      message: "无法扫描文件内容",
      severity: "warning",
      field: "content",
    });
  }

  return issues;
}

/** * CheckFileclass型安全性*/
async function checkFileTypeSecurity(file: File): Promise<ValidationError[]> {
  const issues: ValidationError[] = [];

  const detectedType = await detectFileType(file);

  if (detectedType.type === "malicious") {
    issues.push({
      code: "MALICIOUS_FILE_TYPE",
      message: "检测到恶意文件类型",
      severity: "error",
      field: "type",
    });
  }

  if (detectedType.type === "unknown") {
    issues.push({
      code: "UNKNOWN_FILE_TYPE",
      message: "无法识别文件类型",
      severity: "warning",
      field: "type",
    });
  }

  return issues;
}

/** * 主要FileValidate函数*/
export async function validateFileWithSecurity(file: File): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    info: [],
    fileSize: file.size,
  };

  try {
    // 1. 基本Validate
    if (file.size === 0) {
      result.errors.push({
        code: "EMPTY_FILE",
        message: "文件为空",
        severity: "error",
        field: "size",
      });
    }

    // 2. Fileclass型检测
    const detectedType = await detectFileType(file);
    result.fileType = detectedType.type;

    if (detectedType.type === "malicious") {
      result.errors.push({
        code: "MALICIOUS_SIGNATURE",
        message: "文件签名匹配已知的恶意文件类型",
        severity: "error",
        field: "type",
        details: { detectedType: detectedType.type },
      });
    }

    if (detectedType.type === "unknown") {
      result.warnings.push({
        code: "UNKNOWN_TYPE",
        message: "无法识别文件类型",
        severity: "warning",
        field: "type",
        details: { detectedType: detectedType.type },
      });
    }

    // 3. 扩展名Validate
    const extensionError = validateExtensionMatch(file, detectedType.type);
    if (extensionError) {
      if (extensionError.severity === "error") {
        result.errors.push(extensionError);
      } else {
        result.warnings.push(extensionError);
      }
    }

    // 4. Audio内容Validate（仅对AudioFile）
    if (detectedType.type.startsWith("audio/")) {
      const audioValidation = await validateAudioContent(file);

      if ("code" in audioValidation) {
        if (audioValidation.severity === "error") {
          result.errors.push(audioValidation);
        } else {
          result.warnings.push(audioValidation);
        }
      } else {
        result.audioProperties = audioValidation;

        // AddAudio信息
        result.info.push({
          code: "AUDIO_PROPERTIES",
          message: `音频文件验证通过 - 时长: ${formatDuration(audioValidation.duration || 0)}, 采样率: ${audioValidation.sampleRate}Hz`,
          severity: "info",
          field: "audio",
          details: audioValidation as Record<string, unknown>,
        });
      }
    }

    // 5. 安全性Check
    const securityResult = await performSecurityChecks(file);
    result.securityScore = securityResult.score;

    // 分class安全问题
    securityResult.issues.forEach((issue) => {
      if (issue.severity === "error") {
        result.errors.push(issue);
      } else if (issue.severity === "warning") {
        result.warnings.push(issue);
      } else {
        result.info.push(issue);
      }
    });

    // 6. 确定最终Validate结果
    result.isValid = result.errors.length === 0;

    // AddValidate总结
    result.info.push({
      code: "VALIDATION_SUMMARY",
      message: `文件验证完成 - 安全分数: ${securityResult.score}/100`,
      severity: "info",
      details: {
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
        infoCount: result.info.length,
        securityScore: securityResult.score,
        fileType: detectedType.type,
        fileSize: file.size,
      },
    });
  } catch (error) {
    result.isValid = false;
    result.errors.push({
      code: "VALIDATION_ERROR",
      message: "验证过程中发生错误",
      severity: "error",
      field: "system",
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }

  return result;
}

/** * 格式化时长显示*/
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }
}

/** * 向后兼容简单Validate函数*/
export async function validateFile(file: File): Promise<{ isValid: boolean; errors: string[] }> {
  const result = await validateFileWithSecurity(file);

  return {
    isValid: result.isValid,
    errors: result.errors.map((error) => error.message),
  };
}
