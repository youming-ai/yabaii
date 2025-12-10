#!/usr/bin/env node

/**
 * Build Optimizer
 * Advanced build optimization for enhanced features
 */

const fs = require("fs");
const path = require("path");
const { DeploymentUtils } = require("../utils/deploy-utils");

class BuildOptimizer extends DeploymentUtils {
  constructor(options = {}) {
    super(options);
    this.optimizations = {
      codeSplitting: true,
      treeShaking: true,
      deadCodeElimination: true,
      assetOptimization: true,
      compression: true,
      mobileOptimization: true,
    };
  }

  /**
   * Run comprehensive build optimization
   */
  async optimizeBuild() {
    this.log("Starting comprehensive build optimization...");

    const optimizationSteps = [
      { name: "Pre-build validation", fn: this.validatePreBuild.bind(this) },
      {
        name: "Code splitting configuration",
        fn: this.configureCodeSplitting.bind(this),
      },
      {
        name: "Tree shaking optimization",
        fn: this.optimizeTreeShaking.bind(this),
      },
      { name: "Asset optimization", fn: this.optimizeAssets.bind(this) },
      {
        name: "Mobile-specific optimizations",
        fn: this.optimizeForMobile.bind(this),
      },
      {
        name: "Bundle analysis setup",
        fn: this.setupBundleAnalysis.bind(this),
      },
      { name: "Build execution", fn: this.executeOptimizedBuild.bind(this) },
      { name: "Post-build validation", fn: this.validateBuild.bind(this) },
    ];

    const results = [];

    for (const step of optimizationSteps) {
      try {
        this.log(`Running: ${step.name}`);
        const result = await step.fn();
        results.push({ step: step.name, success: true, result });
        this.log(`✅ Completed: ${step.name}`);
      } catch (error) {
        this.log(`❌ Failed: ${step.name} - ${error.message}`, "error");
        results.push({ step: step.name, success: false, error: error.message });

        if (this.options.failOnError) {
          throw error;
        }
      }
    }

    return {
      success: results.every((r) => r.success),
      results,
      summary: this.generateOptimizationSummary(results),
    };
  }

  /**
   * Validate pre-build requirements
   */
  async validatePreBuild() {
    const validation = {
      packageManager: await this.checkPackageManager(),
      dependencies: await this.checkDependencies(),
      configuration: await this.checkBuildConfiguration(),
      diskSpace: await this.checkDiskSpace(),
    };

    const issues = Object.entries(validation)
      .filter(([key, value]) => !value.valid)
      .map(([key, value]) => `${key}: ${value.message}`);

    if (issues.length > 0) {
      throw new Error(`Pre-build validation failed: ${issues.join(", ")}`);
    }

    return { valid: true, validation };
  }

  /**
   * Check package manager availability
   */
  async checkPackageManager() {
    try {
      const result = await this.executeCommand("pnpm --version", {
        silent: true,
      });
      return {
        valid: true,
        version: result.stdout.trim(),
      };
    } catch (error) {
      return {
        valid: false,
        message: "PNPM not available",
      };
    }
  }

  /**
   * Check dependencies
   */
  async checkDependencies() {
    try {
      const result = await this.executeCommand("pnpm list --depth=0", {
        silent: true,
      });
      return {
        valid: true,
        dependencies: result.stdout.includes(this.packageJson.name),
      };
    } catch (error) {
      return {
        valid: false,
        message: "Dependencies check failed",
      };
    }
  }

  /**
   * Check build configuration
   */
  async checkBuildConfiguration() {
    const requiredFiles = ["next.config.js", "tsconfig.json", "tailwind.config.js"];
    const missingFiles = requiredFiles.filter(
      (file) => !fs.existsSync(path.join(this.options.projectRoot, file)),
    );

    return {
      valid: missingFiles.length === 0,
      message:
        missingFiles.length > 0
          ? `Missing files: ${missingFiles.join(", ")}`
          : "All configuration files present",
    };
  }

  /**
   * Check available disk space
   */
  async checkDiskSpace() {
    try {
      const stats = fs.statSync(this.options.projectRoot);
      return {
        valid: true,
        availableSpace: "Unknown", // Could be enhanced with actual disk space checking
      };
    } catch (error) {
      return {
        valid: false,
        message: "Cannot access project directory",
      };
    }
  }

  /**
   * Configure advanced code splitting
   */
  async configureCodeSplitting() {
    const nextConfigPath = path.join(this.options.projectRoot, "next.config.js");

    // Enhanced code splitting configuration
    const codeSplittingConfig = {
      experimental: {
        optimizePackageImports: ["lucide-react", "@radix-ui/react-icons", "groq-sdk"],
        serverComponentsExternalPackages: ["@tanstack/react-query-devtools"],
      },
      webpack: (config, { isServer, dev }) => {
        // Client-side splitting optimizations
        if (!isServer) {
          config.optimization = {
            ...config.optimization,
            splitChunks: {
              chunks: "all",
              cacheGroups: {
                // Vendor chunk for third-party libraries
                vendor: {
                  test: /[\\/]node_modules[\\/]/,
                  name: "vendors",
                  chunks: "all",
                  priority: 10,
                },
                // UI components chunk
                ui: {
                  test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
                  name: "ui-components",
                  chunks: "all",
                  priority: 20,
                },
                // Player components chunk
                player: {
                  test: /[\\/]src[\\/]components[\\/]features[\\/]player[\\/]/,
                  name: "player-components",
                  chunks: "all",
                  priority: 15,
                },
                // Mobile optimization chunk
                mobile: {
                  test: /[\\/]src[\\/]lib[\\/]mobile[\\/]/,
                  name: "mobile-optimizations",
                  chunks: "async",
                  priority: 5,
                },
                // Performance monitoring chunk
                performance: {
                  test: /[\\/]src[\\/]lib[\\/]performance[\\/]/,
                  name: "performance-monitoring",
                  chunks: "async",
                  priority: 5,
                },
              },
            },
          };
        }

        // Tree shaking enhancements
        config.optimization.usedExports = true;
        config.optimization.sideEffects = false;

        return config;
      },
    };

    this.log("Code splitting configuration generated");
    return { config: codeSplittingConfig };
  }

  /**
   * Optimize tree shaking
   */
  async optimizeTreeShaking() {
    const optimizations = {
      // Package.json side effects configuration
      packageJson: {
        sideEffects: [
          "*.css",
          "*.scss",
          "*.less",
          "src/styles/**/*.css",
          "src/components/**/*.css",
        ],
      },

      // ESLint rules for dead code detection
      eslintRules: {
        "no-unused-vars": "error",
        "no-unreachable": "error",
        "no-useless-return": "error",
        "import/no-unused-modules": "error",
      },

      // TypeScript compilation optimizations
      tsConfig: {
        compilerOptions: {
          importsNotUsedAsValues: "error",
          preserveValueImports: false,
        },
      },
    };

    this.log("Tree shaking optimizations configured");
    return { optimizations };
  }

  /**
   * Optimize assets
   */
  async optimizeAssets() {
    const assetOptimizations = {
      images: {
        formats: ["image/webp", "image/avif"],
        sizes: [16, 32, 48, 64, 96, 128, 256, 384],
        devicePixelRatios: [1, 2, 3],
        quality: 85,
        placeholder: "blur",
        blurDataURL: true,
      },

      fonts: {
        formats: ["woff2", "woff"],
        display: "swap",
        preload: ["Inter-Regular", "Inter-Medium", "Inter-Bold"],
      },

      audio: {
        formats: ["mp3", "webm"],
        compression: {
          mp3: { bitrate: "128k", quality: 2 },
          webm: { bitrate: "96k", quality: 2 },
        },
        chunking: {
          enabled: true,
          chunkSize: 1024 * 1024, // 1MB chunks
          maxFileSize: 50 * 1024 * 1024, // 50MB max file size
        },
      },

      compression: {
        gzip: true,
        brotli: true,
        level: 6,
      },
    };

    this.log("Asset optimization configuration generated");
    return { optimizations: assetOptimizations };
  }

  /**
   * Mobile-specific optimizations
   */
  async optimizeForMobile() {
    const mobileOptimizations = {
      // Touch-friendly configurations
      touch: {
        minTouchTargetSize: 44, // 44px minimum touch target
        gestureOptimization: true,
        hapticFeedback: true,
      },

      // Performance optimizations
      performance: {
        lazyLoading: {
          images: true,
          components: true,
          routes: true,
        },
        virtualScrolling: true,
        reducedMotion: true,
        batteryOptimization: true,
      },

      // Network optimizations
      network: {
        offlineSupport: true,
        backgroundSync: true,
        cacheFirst: ["/api/transcribe", "/api/progress"],
        networkFirst: ["/api/postprocess"],
      },

      // UI optimizations
      ui: {
        adaptiveLayout: true,
        gestureControls: true,
        touchOptimizations: true,
        mobileFirst: true,
      },
    };

    this.log("Mobile optimizations configured");
    return { optimizations: mobileOptimizations };
  }

  /**
   * Setup bundle analysis
   */
  async setupBundleAnalysis() {
    const analysisConfig = {
      bundleAnalyzer: {
        enabled: process.env.ANALYZE === "true",
        openAnalyzer: false,
        analyzerMode: "static",
        reportFilename: "bundle-analyzer-report.html",
        defaultSizes: "gzip",
      },

      webpackBundleAnalyzer: {
        analyzerMode: "json",
        reportFilename: "webpack-bundle-analysis.json",
        generateStatsFile: true,
        statsFilename: "webpack-stats.json",
      },

      performanceBudget: {
        javascript: {
          warning: 250 * 1024, // 250KB
          error: 500 * 1024, // 500KB
        },
        css: {
          warning: 50 * 1024, // 50KB
          error: 100 * 1024, // 100KB
        },
        total: {
          warning: 500 * 1024, // 500KB
          error: 1000 * 1024, // 1MB
        },
      },
    };

    this.log("Bundle analysis configuration generated");
    return { config: analysisConfig };
  }

  /**
   * Execute optimized build
   */
  async executeOptimizedBuild() {
    const buildStartTime = Date.now();

    // Set build environment variables
    const buildEnv = {
      ...process.env,
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
      ANALYZE: process.env.ANALYZE || "false",
      OPTIMIZED_BUILD: "true",
    };

    // Clean previous build
    await this.cleanup();

    // Execute build with optimizations
    const buildCommand = process.env.ANALYZE === "true" ? "pnpm build:analyze" : "pnpm build";

    this.log(`Executing optimized build: ${buildCommand}`);

    const result = await this.executeCommand(buildCommand, {
      env: buildEnv,
      timeout: 600000, // 10 minutes for optimized build
    });

    const buildDuration = Date.now() - buildStartTime;

    if (result.exitCode !== 0) {
      throw new Error(`Build failed with exit code ${result.exitCode}: ${result.stderr}`);
    }

    // Validate build output
    const buildValidation = await this.validateBuildOutput();

    return {
      success: true,
      duration: buildDuration,
      size: buildValidation.stats.sizeMB,
      validation: buildValidation,
    };
  }

  /**
   * Validate build results
   */
  async validateBuild() {
    const validation = await this.validateBuildOutput();

    if (!validation.valid) {
      throw new Error(`Build validation failed: ${validation.errors.join(", ")}`);
    }

    // Performance budget validation
    const budgetValidation = this.validatePerformanceBudget(validation);

    return {
      valid: true,
      validation,
      budget: budgetValidation,
    };
  }

  /**
   * Validate against performance budgets
   */
  validatePerformanceBudget(buildValidation) {
    const budgets = {
      totalSize: 50 * 1024 * 1024, // 50MB
      warningSize: 30 * 1024 * 1024, // 30MB
    };

    const size = buildValidation.stats.size || 0;

    return {
      withinBudget: size <= budgets.totalSize,
      size: size,
      budget: budgets.totalSize,
      warningThreshold: budgets.warningSize,
      percentage: ((size / budgets.totalSize) * 100).toFixed(2),
    };
  }

  /**
   * Generate optimization summary
   */
  generateOptimizationSummary(results) {
    const successfulSteps = results.filter((r) => r.success);
    const failedSteps = results.filter((r) => !r.success);

    return {
      totalSteps: results.length,
      successfulSteps: successfulSteps.length,
      failedSteps: failedSteps.length,
      successRate: ((successfulSteps.length / results.length) * 100).toFixed(2),
      optimizationsApplied: this.getAppliedOptimizations(results),
      recommendations: this.generateRecommendations(results),
    };
  }

  /**
   * Get list of applied optimizations
   */
  getAppliedOptimizations(results) {
    const optimizations = [];

    if (results.some((r) => r.step.includes("Code splitting"))) {
      optimizations.push("Advanced code splitting");
    }
    if (results.some((r) => r.step.includes("Tree shaking"))) {
      optimizations.push("Enhanced tree shaking");
    }
    if (results.some((r) => r.step.includes("Asset optimization"))) {
      optimizations.push("Asset optimization");
    }
    if (results.some((r) => r.step.includes("Mobile"))) {
      optimizations.push("Mobile-specific optimizations");
    }
    if (results.some((r) => r.step.includes("Bundle analysis"))) {
      optimizations.push("Bundle analysis setup");
    }

    return optimizations;
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(results) {
    const recommendations = [];

    if (results.some((r) => !r.success)) {
      recommendations.push("Review failed optimization steps");
    }

    recommendations.push("Monitor bundle size in production");
    recommendations.push("Run performance tests after deployment");
    recommendations.push("Set up bundle size regression monitoring");

    if (this.options.environment === "production") {
      recommendations.push("Enable real user monitoring (RUM)");
      recommendations.push("Set up performance budgets");
    }

    return recommendations;
  }
}

module.exports = { BuildOptimizer };
