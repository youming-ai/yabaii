#!/usr/bin/env node

/**
 * Script to fix Chinese-English mixed comments in the codebase
 * This script will scan through source files and convert Chinese comments to English
 */

const fs = require('fs');
const path = require('path');

// Common Chinese comment patterns and their English translations
const commentTranslations = {
  // File headers
  '简化': 'Simplified',
  '数据库': 'database',
  '操作': 'operations',
  '文件': 'File',
  '移除': 'Removed',
  '复杂的': 'complex',
  '批量': 'batch',
  '处理器': 'processors',
  '保留': 'keep',
  '核心': 'core',
  '功能': 'functionality',

  // Function comments
  '获取': 'Get',
  '设置': 'Set',
  '添加': 'Add',
  '删除': 'Delete',
  '更新': 'Update',
  '查询': 'Query',
  '处理': 'Process',
  '保存': 'Save',
  '检查': 'Check',
  '验证': 'Validate',

  // Descriptions
  '转录': 'Transcription',
  '音频': 'Audio',
  '语言': 'Language',
  '翻译': 'Translation',
  '字幕': 'Subtitle',
  '状态': 'Status',
  '错误': 'Error',
  '成功': 'Success',
  '失败': 'Failed',
  '缓存': 'Cache',
  '内存': 'Memory',

  // Common phrases
  '如果': 'If',
  '否则': 'Otherwise',
  '并且': 'And',
  '或者': 'Or',
  '用于': 'Used for',
  '通过': 'Through',
  '来自': 'From',
  '到': 'To',
  '的': '',
  '是': 'is',
  '为': 'as',
  '中': 'in',

  // Time-related
  '分钟': 'minutes',
  '小时': 'hours',
  '秒': 'seconds',
  '毫秒': 'milliseconds',
  '延迟': 'delay',
  '超时': 'timeout',

  // Technical terms
  '请求': 'request',
  '响应': 'response',
  '客户端': 'client',
  '服务器': 'server',
  '接口': 'API',
  '组件': 'component',
  '钩子': 'hook',
  '状态': 'state',
  '属性': 'property',
  '方法': 'method',
  '类': 'class',
  '对象': 'object',

  // Database terms
  '表': 'table',
  '字段': 'field',
  '索引': 'index',
  '记录': 'record',
  '事务': 'transaction',
  '连接': 'connection',

  // File operations
  '上传': 'upload',
  '下载': 'download',
  '读取': 'read',
  '写入': 'write',
  '路径': 'path',
  '名称': 'name',
  '大小': 'size',
  '类型': 'type',
};

// Common comment patterns
const commentPatterns = [
  // Single-line comments
  { pattern: /\/\/(.*)/g, type: 'single' },
  // Multi-line comments
  { pattern: /\/\*([\s\S]*?)\*\//g, type: 'multi' },
];

function translateComment(comment) {
  let translated = comment;

  // Apply translations
  Object.entries(commentTranslations).forEach(([chinese, english]) => {
    const regex = new RegExp(chinese, 'g');
    translated = translated.replace(regex, english);
  });

  // Fix common grammar issues
  translated = translated
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .replace(/^\s+|\s+$/g, '') // Trim
    .replace(/\b(\w)s\b/g, '$1') // Remove trailing 's' from single characters
    .replace(/\b(\w)ing\b/g, '$1ing'); // Fix -ing endings

  return translated;
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let newContent = content;

    commentPatterns.forEach(({ pattern, type }) => {
      newContent = newContent.replace(pattern, (match, commentText) => {
        const originalComment = match;
        const translatedText = translateComment(commentText);

        if (translatedText !== commentText) {
          modified = true;
          if (type === 'single') {
            return `// ${translatedText}`;
          } else {
            return `/*${translatedText}*/`;
          }
        }

        return originalComment;
      });
    });

    if (modified) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function scanDirectory(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = [];

  function scan(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip node_modules, .git, and build directories
        if (!['node_modules', '.git', '.next', 'dist', 'build'].includes(item)) {
          scan(fullPath);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  scan(dir);
  return files;
}

function main() {
  const projectDir = process.cwd();
  const sourceDir = path.join(projectDir, 'src');

  if (!fs.existsSync(sourceDir)) {
    console.error('❌ src directory not found!');
    process.exit(1);
  }

  console.log('🔍 Scanning source files...');
  const files = scanDirectory(sourceDir);

  console.log(`📁 Found ${files.length} source files`);

  let updatedCount = 0;

  for (const file of files) {
    if (processFile(file)) {
      updatedCount++;
    }
  }

  console.log(`\n✨ Processed complete!`);
  console.log(`📊 Files scanned: ${files.length}`);
  console.log(`📝 Files updated: ${updatedCount}`);

  if (updatedCount > 0) {
    console.log('\n💡 Next steps:');
    console.log('1. Review the changes with `git diff`');
    console.log('2. Run the linter to ensure code quality: `pnpm format`');
    console.log('3. Run tests to ensure nothing broke: `pnpm test`');
  }
}

if (require.main === module) {
  main();
}

module.exports = { translateComment, processFile };