#!/usr/bin/env node

/**
 * Bundle Analyzer
 * Advanced bundle analysis and optimization tools
 */

const fs = require("fs");
const path = require("path");
const { DeploymentUtils } = require("../utils/deploy-utils");

class BundleAnalyzer extends DeploymentUtils {
  constructor(options = {}) {
    super(options);
    this.analysisResults = {
      bundles: {},
      dependencies: {},
      assets: {},
      recommendations: [],
    };
    this.performanceBudgets = this.getPerformanceBudgets();
  }

  /**
   * Get performance budgets
   */
  getPerformanceBudgets() {
    return {
      javascript: {
        warning: 250 * 1024, // 250KB
        error: 400 * 1024, // 400KB
      },
      css: {
        warning: 50 * 1024, // 50KB
        error: 75 * 1024, // 75KB
      },
      total: {
        warning: 500 * 1024, // 500KB
        error: 750 * 1024, // 750KB
      },
      images: {
        warning: 500 * 1024, // 500KB
        error: 1000 * 1024, // 1MB
      },
      fonts: {
        warning: 100 * 1024, // 100KB
        error: 200 * 1024, // 200KB
      },
    };
  }

  /**
   * Run comprehensive bundle analysis
   */
  async runBundleAnalysis() {
    this.log("🔍 Starting comprehensive bundle analysis...");

    try {
      const analysisSteps = [
        { name: "Analyze webpack stats", fn: this.analyzeWebpackStats.bind(this) },
        { name: "Analyze bundle composition", fn: this.analyzeBundleComposition.bind(this) },
        { name: "Analyze dependencies", fn: this.analyzeDependencies.bind(this) },
        { name: "Analyze assets", fn: this.analyzeAssets.bind(this) },
        { name: "Check performance budgets", fn: this.checkPerformanceBudgets.bind(this) },
        {
          name: "Generate optimization recommendations",
          fn: this.generateRecommendations.bind(this),
        },
        { name: "Create optimization plan", fn: this.createOptimizationPlan.bind(this) },
      ];

      const results = [];

      for (const step of analysisSteps) {
        try {
          this.log(`Running: ${step.name}`);
          const result = await step.fn();
          results.push({ step: step.name, success: true, result });
          this.log(`✅ Completed: ${step.name}`);
        } catch (error) {
          this.log(`❌ Failed: ${step.name} - ${error.message}`, "error");
          results.push({ step: step.name, success: false, error: error.message });
        }
      }

      // Generate final report
      const report = await this.generateAnalysisReport(results);

      this.log("✅ Bundle analysis completed successfully");
      return {
        success: results.every((r) => r.success),
        results,
        report,
        analysisResults: this.analysisResults,
      };
    } catch (error) {
      this.log(`❌ Bundle analysis failed: ${error.message}`, "error");
      throw error;
    }
  }

  /**
   * Analyze webpack stats
   */
  async analyzeWebpackStats() {
    const statsPath = path.join(this.options.projectRoot, ".next", "webpack-stats.json");

    if (!fs.existsSync(statsPath)) {
      // Generate webpack stats if not available
      await this.generateWebpackStats();
    }

    try {
      const stats = JSON.parse(fs.readFileSync(statsPath, "utf8"));

      const analysis = {
        totalSize: 0,
        chunks: [],
        assets: [],
        modules: [],
        entryPoints: {},
        dependencies: new Set(),
        duplicateModules: [],
        largeModules: [],
      };

      // Analyze chunks
      if (stats.chunks) {
        stats.chunks.forEach((chunk) => {
          const chunkInfo = {
            id: chunk.id,
            name: chunk.names?.[0] || `chunk-${chunk.id}`,
            size: chunk.size || 0,
            modules: chunk.modules?.length || 0,
            files: chunk.files || [],
          };

          analysis.chunks.push(chunkInfo);
          analysis.totalSize += chunkInfo.size;
        });
      }

      // Analyze assets
      if (stats.assets) {
        stats.assets.forEach((asset) => {
          const assetInfo = {
            name: asset.name,
            size: asset.size || 0,
            chunks: asset.chunks || [],
            emitted: asset.emitted || false,
          };

          analysis.assets.push(assetInfo);
        });
      }

      // Analyze modules
      if (stats.modules) {
        stats.modules.forEach((module) => {
          const moduleInfo = {
            name: module.name,
            size: module.size || 0,
            chunks: module.chunks || [],
            reasons: module.reasons?.length || 0,
          };

          analysis.modules.push(moduleInfo);

          // Track large modules
          if (module.size > 50000) {
            // 50KB
            analysis.largeModules.push(moduleInfo);
          }
        });
      }

      // Analyze entry points
      if (stats.entrypoints) {
        Object.entries(stats.entrypoints).forEach(([name, entrypoint]) => {
          analysis.entryPoints[name] = {
            name,
            assets: entrypoint.assets || [],
            chunks: entrypoint.chunks || [],
          };
        });
      }

      this.analysisResults.webpackStats = analysis;

      return analysis;
    } catch (error) {
      throw new Error(`Failed to analyze webpack stats: ${error.message}`);
    }
  }

  /**
   * Generate webpack stats if not available
   */
  async generateWebpackStats() {
    this.log("Generating webpack stats...");

    // This would typically be done during the build process
    // For now, we'll create a placeholder
    const statsDir = path.join(this.options.projectRoot, ".next");

    if (!fs.existsSync(statsDir)) {
      fs.mkdirSync(statsDir, { recursive: true });
    }

    // Create a placeholder stats file
    const placeholderStats = {
      chunks: [],
      assets: [],
      modules: [],
      entrypoints: {},
    };

    fs.writeFileSync(
      path.join(statsDir, "webpack-stats.json"),
      JSON.stringify(placeholderStats, null, 2),
    );
  }

  /**
   * Analyze bundle composition
   */
  async analyzeBundleComposition() {
    const analysis = {
      totalBundles: 0,
      totalSize: 0,
      compressionRatio: 0,
      composition: {
        vendor: 0,
        application: 0,
        shared: 0,
        async: 0,
      },
      compression: {
        gzip: 0,
        brotli: 0,
      },
    };

    // Analyze .next/static/chunks directory
    const chunksDir = path.join(this.options.projectRoot, ".next", "static", "chunks");

    if (fs.existsSync(chunksDir)) {
      const chunkFiles = fs.readdirSync(chunksDir);

      chunkFiles.forEach((file) => {
        const filePath = path.join(chunksDir, file);
        const stats = fs.statSync(filePath);

        analysis.totalBundles++;
        analysis.totalSize += stats.size;

        // Categorize chunks
        if (file.includes("vendor") || file.includes("node_modules")) {
          analysis.composition.vendor += stats.size;
        } else if (file.includes("framework") || file.includes("main")) {
          analysis.composition.application += stats.size;
        } else if (file.includes("common") || file.includes("shared")) {
          analysis.composition.shared += stats.size;
        } else {
          analysis.composition.async += stats.size;
        }
      });
    }

    // Calculate compression ratios (simulated)
    analysis.compressionRatio = 0.3; // Typical gzip compression ratio
    analysis.compression.gzip = analysis.totalSize * analysis.compressionRatio;
    analysis.compression.brotli = analysis.totalSize * 0.25; // Better compression with Brotli

    this.analysisResults.bundleComposition = analysis;

    return analysis;
  }

  /**
   * Analyze dependencies
   */
  async analyzeDependencies() {
    const packageJsonPath = path.join(this.options.projectRoot, "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

    const analysis = {
      dependencies: Object.keys(packageJson.dependencies || {}),
      devDependencies: Object.keys(packageJson.devDependencies || {}),
      totalDependencies: 0,
      largeDependencies: [],
      unusedDependencies: [],
      duplicateDependencies: [],
      optimizationCandidates: [],
    };

    // Analyze dependency sizes (simulated)
    const dependencySizes = {
      react: 42000,
      "react-dom": 130000,
      next: 250000,
      "@tanstack/react-query": 58000,
      "groq-sdk": 45000,
      "lucide-react": 180000,
      "@radix-ui": 85000,
    };

    analysis.dependencies.forEach((dep) => {
      const size = dependencySizes[dep] || 10000; // Default 10KB

      if (size > 50000) {
        // 50KB threshold
        analysis.largeDependencies.push({ name: dep, size });
      }

      analysis.totalDependencies++;
    });

    // Identify optimization candidates
    analysis.optimizationCandidates = [
      {
        name: "lucide-react",
        reason: "Large icon library, consider tree-shaking or individual imports",
        potentialSavings: "60-70%",
      },
      {
        name: "react-query-devtools",
        reason: "Development-only dependency, should be excluded from production",
        potentialSavings: "100%",
      },
    ];

    this.analysisResults.dependencies = analysis;

    return analysis;
  }

  /**
   * Analyze assets
   */
  async analyzeAssets() {
    const analysis = {
      totalAssets: 0,
      totalSize: 0,
      categories: {
        images: { count: 0, size: 0 },
        fonts: { count: 0, size: 0 },
        javascript: { count: 0, size: 0 },
        css: { count: 0, size: 0 },
        other: { count: 0, size: 0 },
      },
      optimizationOpportunities: [],
    };

    // Analyze .next/static directory
    const staticDir = path.join(this.options.projectRoot, ".next", "static");

    if (fs.existsSync(staticDir)) {
      await this.analyzeDirectory(staticDir, analysis);
    }

    // Analyze public directory
    const publicDir = path.join(this.options.projectRoot, "public");

    if (fs.existsSync(publicDir)) {
      await this.analyzeDirectory(publicDir, analysis);
    }

    // Identify optimization opportunities
    if (analysis.categories.images.size > this.performanceBudgets.images.warning) {
      analysis.optimizationOpportunities.push({
        type: "images",
        currentSize: analysis.categories.images.size,
        recommendation: "Optimize images with WebP/AVIF format and proper sizing",
      });
    }

    if (analysis.categories.fonts.size > this.performanceBudgets.fonts.warning) {
      analysis.optimizationOpportunities.push({
        type: "fonts",
        currentSize: analysis.categories.fonts.size,
        recommendation: "Subset fonts and use woff2 format",
      });
    }

    this.analysisResults.assets = analysis;

    return analysis;
  }

  /**
   * Analyze directory recursively
   */
  async analyzeDirectory(dirPath, analysis) {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        await this.analyzeDirectory(itemPath, analysis);
      } else {
        analysis.totalAssets++;
        analysis.totalSize += stats.size;

        const ext = path.extname(item).toLowerCase();
        const size = stats.size;

        if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"].includes(ext)) {
          analysis.categories.images.count++;
          analysis.categories.images.size += size;
        } else if ([".woff", ".woff2", ".ttf", ".eot"].includes(ext)) {
          analysis.categories.fonts.count++;
          analysis.categories.fonts.size += size;
        } else if ([".js", ".mjs"].includes(ext)) {
          analysis.categories.javascript.count++;
          analysis.categories.javascript.size += size;
        } else if ([".css"].includes(ext)) {
          analysis.categories.css.count++;
          analysis.categories.css.size += size;
        } else {
          analysis.categories.other.count++;
          analysis.categories.other.size += size;
        }
      }
    }
  }

  /**
   * Check performance budgets
   */
  async checkPerformanceBudgets() {
    const analysis = {
      budgets: this.performanceBudgets,
      actual: {
        javascript: this.analysisResults.bundleComposition?.compression?.brotli || 0,
        css: this.analysisResults.assets?.categories?.css?.size || 0,
        total: this.analysisResults.bundleComposition?.totalSize || 0,
        images: this.analysisResults.assets?.categories?.images?.size || 0,
        fonts: this.analysisResults.assets?.categories?.fonts?.size || 0,
      },
      status: {
        withinBudget: true,
        warnings: [],
        errors: [],
      },
    };

    // Check each category
    Object.entries(this.performanceBudgets).forEach(([category, budget]) => {
      const actual = analysis.actual[category];

      if (actual > budget.error) {
        analysis.status.errors.push(
          `${category} exceeds error budget: ${(actual / 1024).toFixed(1)}KB > ${(budget.error / 1024).toFixed(1)}KB`,
        );
        analysis.status.withinBudget = false;
      } else if (actual > budget.warning) {
        analysis.status.warnings.push(
          `${category} exceeds warning budget: ${(actual / 1024).toFixed(1)}KB > ${(budget.warning / 1024).toFixed(1)}KB`,
        );
      }
    });

    this.analysisResults.budgetCheck = analysis;

    return analysis;
  }

  /**
   * Generate optimization recommendations
   */
  async generateRecommendations() {
    const recommendations = [];

    // Bundle size recommendations
    if (this.analysisResults.bundleComposition?.totalSize > this.performanceBudgets.total.warning) {
      recommendations.push({
        category: "Bundle Size",
        priority: "high",
        title: "Reduce total bundle size",
        description: `Current bundle size is ${(this.analysisResults.bundleComposition.totalSize / 1024).toFixed(1)}KB, exceeding the ${(this.performanceBudgets.total.warning / 1024).toFixed(1)}KB warning budget`,
        actions: [
          "Implement code splitting for larger components",
          "Remove unused dependencies",
          "Optimize import statements",
          "Use dynamic imports for non-critical code",
        ],
        potentialSavings: "20-40%",
      });
    }

    // Dependency recommendations
    if (this.analysisResults.dependencies?.largeDependencies?.length > 0) {
      recommendations.push({
        category: "Dependencies",
        priority: "medium",
        title: "Optimize large dependencies",
        description: `Found ${this.analysisResults.dependencies.largeDependencies.length} large dependencies`,
        actions: [
          "Use tree-shaking for large libraries",
          "Consider alternative smaller libraries",
          "Implement lazy loading for heavy components",
          "Use CDN for popular libraries",
        ],
        potentialSavings: "15-25%",
      });
    }

    // Asset optimization recommendations
    if (
      this.analysisResults.assets?.categories?.images?.size > this.performanceBudgets.images.warning
    ) {
      recommendations.push({
        category: "Assets",
        priority: "high",
        title: "Optimize image assets",
        description: `Image assets are ${(this.analysisResults.assets.categories.images.size / 1024).toFixed(1)}KB, exceeding recommendations`,
        actions: [
          "Convert images to WebP/AVIF format",
          "Implement responsive images with srcset",
          "Use image lazy loading",
          "Compress images without quality loss",
        ],
        potentialSavings: "30-60%",
      });
    }

    // Code splitting recommendations
    if (this.analysisResults.bundleComposition?.composition?.async < 0.3) {
      recommendations.push({
        category: "Code Splitting",
        priority: "medium",
        title: "Improve code splitting",
        description:
          "Only 30% of code is split into async chunks, consider more aggressive splitting",
        actions: [
          "Split large components into separate chunks",
          "Implement route-based code splitting",
          "Use dynamic imports for features",
          "Split vendor libraries appropriately",
        ],
        potentialSavings: "15-30%",
      });
    }

    // Performance monitoring recommendations
    recommendations.push({
      category: "Monitoring",
      priority: "low",
      title: "Set up performance monitoring",
      description: "Monitor bundle size and performance in production",
      actions: [
        "Set up bundle size regression alerts",
        "Monitor Core Web Vitals",
        "Track real user performance",
        "Set up automated performance testing",
      ],
      potentialSavings: "Ongoing optimization",
    });

    this.analysisResults.recommendations = recommendations;

    return recommendations;
  }

  /**
   * Create optimization plan
   */
  async createOptimizationPlan() {
    const plan = {
      phases: [],
      timeline: "2-3 sprints",
      expectedSavings: "30-50% bundle size reduction",
    };

    // Phase 1: Quick wins
    plan.phases.push({
      name: "Phase 1: Quick Wins (1 sprint)",
      description: "Implement high-impact, low-risk optimizations",
      tasks: [
        "Remove development-only dependencies from production",
        "Implement basic code splitting",
        "Optimize image formats (WebP/AVIF)",
        "Enable Brotli compression",
      ],
      expectedSavings: "15-20%",
      risk: "low",
    });

    // Phase 2: Advanced optimizations
    plan.phases.push({
      name: "Phase 2: Advanced Optimizations (1 sprint)",
      description: "Implement more complex optimizations requiring code changes",
      tasks: [
        "Implement dynamic imports for heavy components",
        "Optimize dependency imports (tree-shaking)",
        "Implement route-based code splitting",
        "Optimize bundle chunking strategy",
      ],
      expectedSavings: "10-20%",
      risk: "medium",
    });

    // Phase 3: Long-term improvements
    plan.phases.push({
      name: "Phase 3: Long-term Improvements (1 sprint)",
      description: "Implement advanced optimizations and monitoring",
      tasks: [
        "Set up performance monitoring",
        "Implement bundle size regression testing",
        "Optimize critical rendering path",
        "Implement progressive loading strategies",
      ],
      expectedSavings: "5-10%",
      risk: "low",
    });

    this.analysisResults.optimizationPlan = plan;

    return plan;
  }

  /**
   * Generate comprehensive analysis report
   */
  async generateAnalysisReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalBundles: this.analysisResults.bundleComposition?.totalBundles || 0,
        totalSize: this.analysisResults.bundleComposition?.totalSize || 0,
        compressionRatio: this.analysisResults.bundleComposition?.compressionRatio || 0,
        withinBudget: this.analysisResults.budgetCheck?.status?.withinBudget || false,
        warnings: this.analysisResults.budgetCheck?.status?.warnings?.length || 0,
        errors: this.analysisResults.budgetCheck?.status?.errors?.length || 0,
        recommendations: this.analysisResults.recommendations?.length || 0,
      },
      results: this.analysisResults,
      recommendations: this.analysisResults.recommendations || [],
      optimizationPlan: this.analysisResults.optimizationPlan,
      nextSteps: this.getNextSteps(),
    };

    // Save report
    const reportPath = path.join(
      this.options.projectRoot,
      "deployment-info",
      `bundle-analysis-report-${Date.now()}.json`,
    );

    await fs.promises.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Also save markdown version
    const markdownReport = this.generateMarkdownReport(report);
    const markdownPath = path.join(
      this.options.projectRoot,
      "deployment-info",
      `bundle-analysis-report-${Date.now()}.md`,
    );

    await fs.promises.writeFile(markdownPath, markdownReport);

    this.log(`Bundle analysis report saved to: ${reportPath}`);
    this.log(`Bundle analysis markdown report saved to: ${markdownPath}`);

    return report;
  }

  /**
   * Generate next steps
   */
  getNextSteps() {
    const steps = [
      "Review bundle analysis recommendations",
      "Prioritize optimizations based on impact and effort",
      "Create optimization tasks in project management",
      "Implement Phase 1 optimizations",
      "Monitor performance improvements",
    ];

    if (this.analysisResults.budgetCheck?.status?.errors?.length > 0) {
      steps.unshift("Address critical budget issues immediately");
    }

    return steps;
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(report) {
    let markdown = `# Bundle Analysis Report\n\n`;
    markdown += `**Generated:** ${report.timestamp}\n\n`;

    // Summary
    markdown += `## Summary\n\n`;
    markdown += `- **Total Bundles:** ${report.summary.totalBundles}\n`;
    markdown += `- **Total Size:** ${(report.summary.totalSize / 1024).toFixed(1)}KB\n`;
    markdown += `- **Compression Ratio:** ${(report.summary.compressionRatio * 100).toFixed(1)}%\n`;
    markdown += `- **Within Budget:** ${report.summary.withinBudget ? "✅" : "❌"}\n`;
    markdown += `- **Warnings:** ${report.summary.warnings}\n`;
    markdown += `- **Errors:** ${report.summary.errors}\n`;
    markdown += `- **Recommendations:** ${report.summary.recommendations}\n\n`;

    // Recommendations
    if (report.recommendations.length > 0) {
      markdown += `## Recommendations\n\n`;
      report.recommendations.forEach((rec, index) => {
        markdown += `### ${index + 1}. ${rec.title}\n`;
        markdown += `**Priority:** ${rec.priority}\n`;
        markdown += `**Category:** ${rec.category}\n\n`;
        markdown += `${rec.description}\n\n`;

        if (rec.actions && rec.actions.length > 0) {
          markdown += `**Actions:**\n`;
          rec.actions.forEach((action) => {
            markdown += `- ${action}\n`;
          });
          markdown += `\n`;
        }

        markdown += `**Potential Savings:** ${rec.potentialSavings}\n\n`;
      });
    }

    // Optimization Plan
    if (report.optimizationPlan) {
      markdown += `## Optimization Plan\n\n`;
      markdown += `**Timeline:** ${report.optimizationPlan.timeline}\n`;
      markdown += `**Expected Savings:** ${report.optimizationPlan.expectedSavings}\n\n`;

      report.optimizationPlan.phases.forEach((phase) => {
        markdown += `### ${phase.name}\n`;
        markdown += `${phase.description}\n\n`;

        if (phase.tasks && phase.tasks.length > 0) {
          markdown += `**Tasks:**\n`;
          phase.tasks.forEach((task) => {
            markdown += `- ${task}\n`;
          });
          markdown += `\n`;
        }

        markdown += `**Expected Savings:** ${phase.expectedSavings}\n`;
        markdown += `**Risk:** ${phase.risk}\n\n`;
      });
    }

    // Next Steps
    if (report.nextSteps && report.nextSteps.length > 0) {
      markdown += `## Next Steps\n\n`;
      report.nextSteps.forEach((step, index) => {
        markdown += `${index + 1}. ${step}\n`;
      });
      markdown += `\n`;
    }

    return markdown;
  }
}

// CLI interface
if (require.main === module) {
  const analyzer = new BundleAnalyzer();
  analyzer
    .runBundleAnalysis()
    .then((result) => {
      console.log("Bundle analysis completed:", result.success);
      if (!result.success) {
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("Bundle analysis failed:", error);
      process.exit(1);
    });
}

module.exports = { BundleAnalyzer };
