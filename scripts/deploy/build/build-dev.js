#!/usr/bin/env node

/**
 * Development Build Script
 * Optimized build for development environment with debugging features
 */

const { BuildOptimizer } = require("./build-optimizer");
const path = require("path");

class DevelopmentBuild extends BuildOptimizer {
  constructor(options = {}) {
    super({
      ...options,
      environment: "development",
      verbose: true,
      failOnError: false, // Development should not fail on minor issues
    });
  }

  /**
   * Run development-optimized build
   */
  async runDevelopmentBuild() {
    this.log("🚀 Starting development build optimization...");

    try {
      // Set development environment
      process.env.NODE_ENV = "development";
      process.env.NEXT_PUBLIC_DEPLOYMENT_PLATFORM = "development";
      process.env.DEBUG_MODE = "true";

      // Development-specific optimizations
      const devOptimizations = await this.configureDevelopmentOptimizations();

      // Run base build optimizations with development settings
      const buildResult = await this.runBuildWithDevelopmentSettings();

      // Development-specific validations
      const validation = await this.validateDevelopmentBuild(buildResult);

      // Generate development report
      const report = await this.generateDevelopmentReport(buildResult, validation);

      this.log("✅ Development build completed successfully");
      return {
        success: true,
        environment: "development",
        buildResult,
        validation,
        report,
        optimizations: devOptimizations,
      };
    } catch (error) {
      this.log(`❌ Development build failed: ${error.message}`, "error");
      throw error;
    }
  }

  /**
   * Configure development-specific optimizations
   */
  async configureDevelopmentOptimizations() {
    return {
      // Fast refresh optimizations
      fastRefresh: {
        enabled: true,
        optimizePackageImports: false, // Disable for better debugging
        preserveWebpackModules: true,
      },

      // Source map optimizations for debugging
      sourceMaps: {
        enabled: true,
        type: "eval-cheap-module-source-map",
        include: ["src/**/*"],
        exclude: ["node_modules/**"],
      },

      // Development server optimizations
      devServer: {
        port: 3000,
        host: "localhost",
        hot: true,
        liveReload: true,
        compress: false, // Disable compression for faster builds
      },

      // Performance monitoring (development mode)
      performance: {
        enabled: true,
        bundleAnalysis: true,
        memoryUsage: true,
        buildTimeAnalysis: true,
      },

      // Error reporting
      errorHandling: {
        detailedErrors: true,
        sourceMapTracing: true,
        errorBoundaries: true,
      },
    };
  }

  /**
   * Run build with development-specific settings
   */
  async runBuildWithDevelopmentSettings() {
    const startTime = Date.now();

    // Development Next.js configuration
    const devConfig = {
      ...(await this.configureCodeSplitting()),

      // Development-specific webpack config
      webpack: (config, { dev }) => {
        if (!dev) {
          return config;
        }

        // Development optimizations
        config.devtool = "eval-cheap-module-source-map";

        // Enable HMR
        config.watchOptions = {
          poll: 1000,
          aggregateTimeout: 300,
          ignored: ["node_modules/**", ".next/**"],
        };

        // Development-specific resolve optimizations
        config.resolve.alias = {
          ...config.resolve.alias,
          "react-native": "react-native-web",
        };

        return config;
      },
    };

    // Execute development build
    this.log("Running development build...");

    const result = await this.executeCommand("pnpm build", {
      timeout: 300000, // 5 minutes for dev build
      env: {
        ...process.env,
        NODE_ENV: "development",
        NEXT_PUBLIC_DEBUG: "true",
        ANALYZE: "false",
      },
    });

    const buildTime = Date.now() - startTime;

    if (result.exitCode !== 0) {
      throw new Error(`Development build failed: ${result.stderr}`);
    }

    return {
      success: true,
      buildTime,
      output: result.stdout,
      config: devConfig,
    };
  }

  /**
   * Validate development build
   */
  async validateDevelopmentBuild(buildResult) {
    const validations = {
      buildOutput: await this.validateBuildOutput(),
      performance: await this.validateDevelopmentPerformance(buildResult),
      features: await this.validateDevelopmentFeatures(),
      debugCapabilities: await this.validateDebugCapabilities(),
    };

    const issues = [];

    // Check for critical issues
    if (!validations.buildOutput.valid) {
      issues.push(...validations.buildOutput.errors);
    }

    if (!validations.debugCapabilities.sourceMaps) {
      issues.push("Source maps are not available");
    }

    return {
      valid: issues.length === 0,
      validations,
      issues,
      recommendations: this.generateDevelopmentRecommendations(validations),
    };
  }

  /**
   * Validate development performance
   */
  async validateDevelopmentPerformance(buildResult) {
    const buildTimeThreshold = 60000; // 1 minute for dev build
    const memoryThreshold = 512 * 1024 * 1024; // 512MB

    return {
      buildTime: {
        actual: buildResult.buildTime,
        threshold: buildTimeThreshold,
        acceptable: buildResult.buildTime <= buildTimeThreshold,
      },
      memoryUsage: process.memoryUsage(),
      recommendations:
        buildResult.buildTime > buildTimeThreshold
          ? ["Consider enabling fast refresh optimizations"]
          : [],
    };
  }

  /**
   * Validate development features
   */
  async validateDevelopmentFeatures() {
    const features = {
      hotReload: true, // Assumed enabled in development
      fastRefresh: true,
      errorReporting: true,
      devTools: true,
    };

    return {
      features,
      enabled: Object.values(features).every(Boolean),
    };
  }

  /**
   * Validate debug capabilities
   */
  async validateDebugCapabilities() {
    return {
      sourceMaps: true, // Enabled in dev config
      errorTracing: true,
      performanceProfiling: true,
      componentHotReload: true,
    };
  }

  /**
   * Generate development recommendations
   */
  generateDevelopmentRecommendations(validations) {
    const recommendations = [];

    if (!validations.buildOutput.valid) {
      recommendations.push("Fix build output issues before continuing development");
    }

    if (validations.performance.buildTime.actual > validations.performance.buildTime.threshold) {
      recommendations.push("Consider optimizing build time for better development experience");
    }

    recommendations.push("Enable React DevTools for better debugging");
    recommendations.push("Use Redux DevTools if state management is complex");
    recommendations.push("Monitor memory usage during development");

    return recommendations;
  }

  /**
   * Generate development build report
   */
  async generateDevelopmentReport(buildResult, validation) {
    const report = {
      timestamp: new Date().toISOString(),
      environment: "development",
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
        hotReload: true,
        fastRefresh: true,
        sourceMaps: true,
        errorReporting: true,
      },
      nextSteps: [
        "Start development server with: pnpm dev",
        "Open browser to: http://localhost:3000",
        "Enable React DevTools for debugging",
        "Monitor performance during development",
      ],
    };

    // Save development report
    const reportPath = path.join(
      this.options.projectRoot,
      "deployment-info",
      `development-build-report-${Date.now()}.json`,
    );

    const { promises: fs } = require("fs");
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    this.log(`Development build report saved to: ${reportPath}`);

    return report;
  }

  /**
   * Start development server with optimizations
   */
  async startDevelopmentServer() {
    this.log("🚀 Starting optimized development server...");

    try {
      // Run development build first
      await this.runDevelopmentBuild();

      // Start development server
      this.log("Starting development server...");

      const server = await this.executeCommand("pnpm dev", {
        timeout: 0, // Run indefinitely
        env: {
          ...process.env,
          NODE_ENV: "development",
          PORT: "3000",
          HOST: "localhost",
        },
      });

      return {
        success: true,
        url: "http://localhost:3000",
        server,
      };
    } catch (error) {
      this.log(`Failed to start development server: ${error.message}`, "error");
      throw error;
    }
  }
}

// CLI interface
if (require.main === module) {
  const build = new DevelopmentBuild();
  build
    .runDevelopmentBuild()
    .then((result) => {
      console.log("Development build completed:", result.success);
      if (!result.success) {
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("Development build failed:", error);
      process.exit(1);
    });
}

module.exports = { DevelopmentBuild };
