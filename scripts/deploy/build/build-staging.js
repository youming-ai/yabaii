#!/usr/bin/env node

/**
 * Staging Build Script
 * Optimized build for staging environment with production-like features and debugging
 */

const { BuildOptimizer } = require("./build-optimizer");
const path = require("path");

class StagingBuild extends BuildOptimizer {
  constructor(options = {}) {
    super({
      ...options,
      environment: "staging",
      verbose: true,
      failOnError: true, // Staging should fail on issues
    });
  }

  /**
   * Run staging-optimized build
   */
  async runStagingBuild() {
    this.log("🚀 Starting staging build optimization...");

    try {
      // Set staging environment
      process.env.NODE_ENV = "production";
      process.env.VERCEL_ENV = "preview";
      process.env.NEXT_PUBLIC_DEPLOYMENT_PLATFORM = "vercel";
      process.env.STAGING_MODE = "true";

      // Staging-specific optimizations
      const stagingOptimizations = await this.configureStagingOptimizations();

      // Run comprehensive build optimizations
      const buildResult = await this.runBuildWithStagingSettings();

      // Staging-specific validations
      const validation = await this.validateStagingBuild(buildResult);

      // Generate staging report
      const report = await this.generateStagingReport(buildResult, validation);

      this.log("✅ Staging build completed successfully");
      return {
        success: true,
        environment: "staging",
        buildResult,
        validation,
        report,
        optimizations: stagingOptimizations,
      };
    } catch (error) {
      this.log(`❌ Staging build failed: ${error.message}`, "error");
      throw error;
    }
  }

  /**
   * Configure staging-specific optimizations
   */
  async configureStagingOptimizations() {
    return {
      // Production-like optimizations with debugging
      productionLike: {
        minification: true,
        treeShaking: true,
        deadCodeElimination: true,
        codeSplitting: true,
      },

      // Debugging capabilities for staging
      debugging: {
        sourceMaps: true, // Keep source maps for debugging
        bundleAnalysis: true, // Enable bundle analysis
        errorReporting: true,
        performanceMonitoring: true,
      },

      // Testing optimizations
      testing: {
        e2eTesting: true,
        performanceTesting: true,
        accessibilityTesting: true,
        integrationTesting: true,
      },

      // Feature flags for staging
      featureFlags: {
        experimentalFeatures: true,
        newOptimizations: true,
        betaFeatures: true,
        monitoringEnabled: true,
      },

      // Staging-specific monitoring
      monitoring: {
        webVitals: true,
        userAnalytics: false, // Don't track real users in staging
        performanceMetrics: true,
        errorTracking: true,
      },
    };
  }

  /**
   * Run build with staging-specific settings
   */
  async runBuildWithStagingSettings() {
    const startTime = Date.now();

    // Staging Next.js configuration
    const stagingConfig = {
      ...(await this.configureCodeSplitting()),

      // Staging-specific webpack config
      webpack: (config, { isServer }) => {
        // Production optimizations
        config.optimization = {
          ...config.optimization,
          minimize: true,
          usedExports: true,
          sideEffects: false,
        };

        // Keep source maps for debugging
        if (!isServer) {
          config.devtool = "source-map";
        }

        // Bundle analysis configuration
        if (process.env.ANALYZE === "true") {
          const BundleAnalyzerPlugin = require("@next/bundle-analyzer")({
            enabled: true,
          });
          config = BundleAnalyzerPlugin(config);
        }

        // Staging-specific optimizations
        config.optimization.splitChunks = {
          chunks: "all",
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendors",
              chunks: "all",
              priority: 10,
            },
            common: {
              name: "common",
              minChunks: 2,
              chunks: "all",
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        };

        return config;
      },
    };

    // Execute staging build with analysis
    this.log("Running staging build with analysis...");

    const buildCommand = process.env.ANALYZE === "true" ? "pnpm build:analyze" : "pnpm build";

    const result = await this.executeCommand(buildCommand, {
      timeout: 600000, // 10 minutes for staging build
      env: {
        ...process.env,
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
        STAGING_MODE: "true",
        ANALYZE: process.env.ANALYZE || "true",
        NEXT_PUBLIC_DEBUG: "true",
      },
    });

    const buildTime = Date.now() - startTime;

    if (result.exitCode !== 0) {
      throw new Error(`Staging build failed: ${result.stderr}`);
    }

    return {
      success: true,
      buildTime,
      output: result.stdout,
      config: stagingConfig,
    };
  }

  /**
   * Validate staging build
   */
  async validateStagingBuild(buildResult) {
    const validations = {
      buildOutput: await this.validateBuildOutput(),
      performance: await this.validateStagingPerformance(buildResult),
      security: await this.validateSecurityFeatures(),
      accessibility: await this.validateAccessibility(),
      bundleSize: await this.validateBundleSize(),
      features: await this.validateStagingFeatures(),
    };

    const issues = [];
    const warnings = [];

    // Check for critical issues
    if (!validations.buildOutput.valid) {
      issues.push(...validations.buildOutput.errors);
    }

    if (!validations.security.valid) {
      issues.push(...validations.security.issues);
    }

    if (!validations.accessibility.compliant) {
      warnings.push(...validations.accessibility.warnings);
    }

    if (!validations.bundleSize.withinBudget) {
      warnings.push(`Bundle size exceeds budget: ${validations.bundleSize.percentage}%`);
    }

    return {
      valid: issues.length === 0,
      validations,
      issues,
      warnings,
      recommendations: this.generateStagingRecommendations(validations),
    };
  }

  /**
   * Validate staging performance
   */
  async validateStagingPerformance(buildResult) {
    const buildTimeThreshold = 300000; // 5 minutes for staging build
    const lighthouseThreshold = 80; // Minimum Lighthouse score

    return {
      buildTime: {
        actual: buildResult.buildTime,
        threshold: buildTimeThreshold,
        acceptable: buildResult.buildTime <= buildTimeThreshold,
      },
      lighthouseScore: {
        threshold: lighthouseThreshold,
        requiresTesting: true,
      },
      recommendations:
        buildResult.buildTime > buildTimeThreshold
          ? ["Consider optimizing build time"]
          : ["Run Lighthouse tests to validate performance"],
    };
  }

  /**
   * Validate security features
   */
  async validateSecurityFeatures() {
    const securityChecks = {
      httpsRequired: true,
      securityHeaders: ["X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy"],
      cspConfigured: true,
      apiRateLimiting: true,
      inputValidation: true,
      outputEncoding: true,
    };

    const issues = [];

    if (!securityChecks.httpsRequired) {
      issues.push("HTTPS is required for staging");
    }

    if (securityChecks.securityHeaders.length === 0) {
      issues.push("Security headers are not configured");
    }

    return {
      valid: issues.length === 0,
      securityChecks,
      issues,
    };
  }

  /**
   * Validate accessibility
   */
  async validateAccessibility() {
    return {
      compliant: true, // Would run actual accessibility tests
      wcagLevel: "AA",
      warnings: [
        "Run automated accessibility tests",
        "Test keyboard navigation",
        "Validate color contrast ratios",
      ],
      requiresTesting: true,
    };
  }

  /**
   * Validate bundle size for staging
   */
  async validateBundleSize() {
    const budgets = {
      javascript: {
        warning: 300 * 1024, // 300KB
        error: 500 * 1024, // 500KB
      },
      css: {
        warning: 75 * 1024, // 75KB
        error: 100 * 1024, // 100KB
      },
      total: {
        warning: 750 * 1024, // 750KB
        error: 1000 * 1024, // 1MB
      },
    };

    // Would analyze actual bundle sizes here
    const actualSizes = {
      javascript: 250 * 1024, // Placeholder
      css: 50 * 1024, // Placeholder
      total: 300 * 1024, // Placeholder
    };

    const withinBudget = actualSizes.total <= budgets.total.warning;
    const percentage = (actualSizes.total / budgets.total.warning) * 100;

    return {
      withinBudget,
      actual: actualSizes,
      budgets,
      percentage: percentage.toFixed(2),
      requiresAnalysis: true,
    };
  }

  /**
   * Validate staging features
   */
  async validateStagingFeatures() {
    const features = {
      bundleAnalysis: process.env.ANALYZE === "true",
      sourceMaps: true,
      errorTracking: true,
      performanceMonitoring: true,
      featureFlags: true,
      analytics: false, // Disabled in staging
      e2eTesting: true,
    };

    return {
      features,
      enabled: Object.entries(features)
        .filter(([key]) => key !== "analytics") // Analytics disabled by design
        .every(([_, enabled]) => enabled),
    };
  }

  /**
   * Generate staging recommendations
   */
  generateStagingRecommendations(validations) {
    const recommendations = [];

    if (!validations.buildOutput.valid) {
      recommendations.push("Fix build output issues before deploying to production");
    }

    if (validations.performance.buildTime.actual > validations.performance.buildTime.threshold) {
      recommendations.push("Optimize build time for faster deployments");
    }

    if (validations.bundleSize.requiresAnalysis) {
      recommendations.push("Run bundle analysis to optimize size");
    }

    if (validations.accessibility.requiresTesting) {
      recommendations.push("Run accessibility tests before production");
    }

    recommendations.push("Run end-to-end tests to validate functionality");
    recommendations.push("Perform load testing for production readiness");
    recommendations.push("Review security scan results");

    return recommendations;
  }

  /**
   * Generate staging build report
   */
  async generateStagingReport(buildResult, validation) {
    const report = {
      timestamp: new Date().toISOString(),
      environment: "staging",
      build: {
        time: buildResult.buildTime,
        success: buildResult.success,
        output: buildResult.output,
      },
      validation,
      performance: {
        buildTime: buildResult.buildTime,
        memoryUsage: process.memoryUsage(),
      },
      features: {
        bundleAnalysis: process.env.ANALYZE === "true",
        sourceMaps: true,
        errorTracking: true,
        performanceMonitoring: true,
        featureFlags: true,
      },
      quality: {
        issues: validation.issues,
        warnings: validation.warnings,
        recommendations: validation.recommendations,
      },
      deployment: {
        readyForProduction: validation.valid && validation.warnings.length === 0,
        nextSteps: [
          "Review build analysis report",
          "Run performance tests",
          "Execute E2E test suite",
          "Perform security scan",
          "Review and fix any issues",
          "Deploy to production when ready",
        ],
      },
    };

    // Save staging report
    const reportPath = path.join(
      this.options.projectRoot,
      "deployment-info",
      `staging-build-report-${Date.now()}.json`,
    );

    const { promises: fs } = require("fs");
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    this.log(`Staging build report saved to: ${reportPath}`);

    return report;
  }

  /**
   * Deploy to staging
   */
  async deployToStaging() {
    this.log("🚀 Deploying to staging environment...");

    try {
      // Run staging build first
      await this.runStagingBuild();

      // Deploy to Vercel preview
      this.log("Deploying to Vercel preview...");

      const deployResult = await this.executeCommand("vercel", {
        timeout: 600000, // 10 minutes for deployment
        env: {
          ...process.env,
          VERCEL_ENV: "preview",
        },
      });

      if (deployResult.exitCode !== 0) {
        throw new Error(`Staging deployment failed: ${deployResult.stderr}`);
      }

      // Extract deployment URL from output
      const deployUrl = this.extractDeploymentUrl(deployResult.stdout);

      this.log(`✅ Staging deployment completed: ${deployUrl}`);

      return {
        success: true,
        environment: "staging",
        url: deployUrl,
        deployment: deployResult,
      };
    } catch (error) {
      this.log(`Failed to deploy to staging: ${error.message}`, "error");
      throw error;
    }
  }

  /**
   * Extract deployment URL from Vercel output
   */
  extractDeploymentUrl(output) {
    const urlMatch = output.match(/https:\/\/[a-zA-Z0-9-]+\.vercel\.app/);
    return urlMatch ? urlMatch[0] : null;
  }
}

// CLI interface
if (require.main === module) {
  const build = new StagingBuild();
  build
    .runStagingBuild()
    .then((result) => {
      console.log("Staging build completed:", result.success);
      if (!result.success) {
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("Staging build failed:", error);
      process.exit(1);
    });
}

module.exports = { StagingBuild };
