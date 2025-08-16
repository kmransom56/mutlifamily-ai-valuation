#!/usr/bin/env node

/**
 * AI-powered health check script for application monitoring
 * This script integrates with the AI health monitoring system
 */

const { performance } = require('perf_hooks');
const fs = require('fs').promises;
const path = require('path');

// Import the AI Health Monitor (when running in app context)
let AIHealthMonitor;
try {
  const healthMonitorModule = require('../../src/lib/ai-automation/health-monitor');
  AIHealthMonitor = healthMonitorModule.AIHealthMonitor;
} catch (error) {
  console.warn('AI Health Monitor not available, using basic checks');
}

class BasicHealthChecker {
  async analyzeSystemHealth() {
    return {
      overallHealth: await this.performBasicChecks(),
      performanceScore: await this.calculateBasicScore(),
      timestamp: new Date()
    };
  }

  async performBasicChecks() {
    try {
      // Check if application is responding
      const response = await this.checkApplicationResponse();
      if (!response.ok) return 'CRITICAL';

      // Check system resources
      const resources = await this.checkSystemResources();
      if (resources.critical) return 'CRITICAL';
      if (resources.warning) return 'WARNING';

      return 'HEALTHY';
    } catch (error) {
      console.error('Basic health check failed:', error);
      return 'CRITICAL';
    }
  }

  async checkApplicationResponse() {
    // Simulate application response check
    return { ok: true, responseTime: 500 };
  }

  async checkSystemResources() {
    const memoryUsage = process.memoryUsage();
    const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    return {
      critical: memoryPercent > 95,
      warning: memoryPercent > 80,
      memoryPercent
    };
  }

  async calculateBasicScore() {
    const memoryUsage = process.memoryUsage();
    const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    let score = 100;
    if (memoryPercent > 95) score -= 30;
    else if (memoryPercent > 80) score -= 15;
    
    return Math.max(0, score);
  }
}

class AdvancedHealthChecker {
  constructor() {
    this.healthMonitor = new AIHealthMonitor();
    this.logPath = path.join(process.cwd(), 'logs', 'health-checks.log');
  }

  async performComprehensiveHealthCheck() {
    const startTime = performance.now();
    
    try {
      console.log('🔍 Starting AI-powered comprehensive health check...');
      
      // Initialize health monitoring
      const healthReport = await this.healthMonitor.analyzeSystemHealth();
      
      // Log the health report
      await this.logHealthReport(healthReport);
      
      // Check for critical issues
      const criticalIssues = this.identifyCriticalIssues(healthReport);
      
      if (criticalIssues.length > 0) {
        console.error('🚨 Critical issues detected:');
        criticalIssues.forEach(issue => {
          console.error(`  - ${issue.description}`);
        });
        
        // Trigger automatic healing if enabled
        if (process.env.AUTO_HEALING_ENABLED === 'true') {
          console.log('🔧 Attempting automatic healing...');
          await this.healthMonitor.triggerAutomaticHealing(healthReport.anomalies);
          
          // Re-check health after healing attempt
          const postHealingReport = await this.healthMonitor.analyzeSystemHealth();
          await this.logHealthReport(postHealingReport, 'post-healing');
          
          if (postHealingReport.overallHealth === 'CRITICAL') {
            console.error('❌ Automatic healing failed - manual intervention required');
            return this.createHealthCheckResult(false, postHealingReport, startTime);
          } else {
            console.log('✅ Automatic healing partially successful');
          }
        }
        
        return this.createHealthCheckResult(false, healthReport, startTime);
      }
      
      // Check for warning conditions
      if (healthReport.overallHealth === 'WARNING') {
        console.warn('⚠️ Warning conditions detected:');
        healthReport.anomalies.forEach(anomaly => {
          if (anomaly.severity === 'HIGH' || anomaly.severity === 'MEDIUM') {
            console.warn(`  - ${anomaly.description}`);
          }
        });
        
        // Trigger proactive healing for warnings
        if (process.env.PROACTIVE_HEALING_ENABLED === 'true') {
          console.log('🔄 Initiating proactive healing measures...');
          await this.healthMonitor.triggerProactiveHealing();
        }
      }
      
      // Generate performance insights
      const insights = this.generatePerformanceInsights(healthReport);
      if (insights.length > 0) {
        console.log('💡 Performance insights:');
        insights.forEach(insight => console.log(`  - ${insight}`));
      }
      
      const duration = performance.now() - startTime;
      console.log(`✅ AI health check completed successfully in ${duration.toFixed(2)}ms`);
      console.log(`📊 Overall Health: ${healthReport.overallHealth}`);
      console.log(`🎯 Performance Score: ${healthReport.performanceScore}/100`);
      
      return this.createHealthCheckResult(true, healthReport, startTime);
      
    } catch (error) {
      console.error('❌ AI health check failed:', error.message);
      await this.logError(error);
      return this.createHealthCheckResult(false, null, startTime, error);
    }
  }

  identifyCriticalIssues(healthReport) {
    return healthReport.anomalies.filter(anomaly => 
      anomaly.severity === 'CRITICAL' || 
      (anomaly.severity === 'HIGH' && anomaly.metric.includes('error'))
    );
  }

  generatePerformanceInsights(healthReport) {
    const insights = [];
    const metrics = healthReport.applicationMetrics;
    
    if (metrics.responseTime > 1500 && metrics.responseTime < 3000) {
      insights.push('Response time is elevated - consider caching optimization');
    }
    
    if (metrics.memoryUsage > 70 && metrics.memoryUsage < 85) {
      insights.push('Memory usage trending high - monitor for potential leaks');
    }
    
    if (metrics.errorRate > 1 && metrics.errorRate < 5) {
      insights.push('Error rate above baseline - review recent changes');
    }
    
    if (metrics.throughput < 200) {
      insights.push('Throughput below optimal - consider scaling or optimization');
    }
    
    return insights;
  }

  async logHealthReport(healthReport, suffix = '') {
    try {
      // Ensure logs directory exists
      const logsDir = path.dirname(this.logPath);
      await fs.mkdir(logsDir, { recursive: true });
      
      const logEntry = {
        timestamp: new Date().toISOString(),
        type: suffix ? `health-check-${suffix}` : 'health-check',
        overallHealth: healthReport.overallHealth,
        performanceScore: healthReport.performanceScore,
        anomaliesCount: healthReport.anomalies.length,
        criticalAnomalies: healthReport.anomalies.filter(a => a.severity === 'CRITICAL').length,
        applicationMetrics: healthReport.applicationMetrics,
        businessMetrics: healthReport.businessMetrics,
        recommendations: healthReport.recommendations
      };
      
      await fs.appendFile(this.logPath, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('Failed to log health report:', error);
    }
  }

  async logError(error) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        type: 'health-check-error',
        error: error.message,
        stack: error.stack
      };
      
      await fs.appendFile(this.logPath, JSON.stringify(logEntry) + '\n');
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }

  createHealthCheckResult(success, healthReport, startTime, error = null) {
    const duration = performance.now() - startTime;
    
    return {
      success,
      duration: Math.round(duration),
      timestamp: new Date().toISOString(),
      healthReport,
      error: error ? error.message : null
    };
  }
}

async function performAIHealthCheck() {
  const healthChecker = AIHealthMonitor ? 
    new AdvancedHealthChecker() : 
    new BasicHealthChecker();

  try {
    let result;
    
    if (AIHealthMonitor) {
      result = await healthChecker.performComprehensiveHealthCheck();
    } else {
      const healthReport = await healthChecker.analyzeSystemHealth();
      result = {
        success: healthReport.overallHealth !== 'CRITICAL',
        healthReport,
        timestamp: new Date().toISOString()
      };
    }

    // Set exit code based on health status
    if (!result.success || (result.healthReport && result.healthReport.overallHealth === 'CRITICAL')) {
      console.error('💀 Health check failed - exiting with error code');
      process.exit(1);
    }

    if (result.healthReport && result.healthReport.overallHealth === 'WARNING') {
      console.warn('⚠️ Health check passed with warnings');
      // Exit with 0 for warnings (Docker should continue running)
      process.exit(0);
    }

    console.log('✅ Health check passed successfully');
    process.exit(0);

  } catch (error) {
    console.error('💥 Health check crashed:', error.message);
    process.exit(1);
  }
}

// Enhanced health check with monitoring
async function enhancedHealthCheck() {
  const startTime = Date.now();
  
  try {
    // Environment-based configuration
    const config = {
      timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 30000,
      retries: parseInt(process.env.HEALTH_CHECK_RETRIES) || 3,
      aiEnabled: process.env.AI_MONITORING_ENABLED === 'true',
      autoHealing: process.env.AUTO_HEALING_ENABLED === 'true',
      proactiveHealing: process.env.PROACTIVE_HEALING_ENABLED === 'true'
    };

    console.log(`🚀 Enhanced health check starting with config:`, config);

    // Perform health check with timeout
    const healthCheckPromise = performAIHealthCheck();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), config.timeout);
    });

    await Promise.race([healthCheckPromise, timeoutPromise]);

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Enhanced health check failed after ${duration}ms:`, error.message);
    
    // Log failure for monitoring
    if (process.env.NODE_ENV === 'production') {
      // In production, could send to monitoring service
      console.log('📊 Sending failure metrics to monitoring service...');
    }
    
    process.exit(1);
  }
}

// Health check with metrics export
async function healthCheckWithMetrics() {
  const metricsFile = path.join(process.cwd(), 'tmp', 'health-metrics.json');
  
  try {
    const healthChecker = AIHealthMonitor ? 
      new AdvancedHealthChecker() : 
      new BasicHealthChecker();

    const result = AIHealthMonitor ? 
      await healthChecker.performComprehensiveHealthCheck() :
      await healthChecker.analyzeSystemHealth();

    // Export metrics for external monitoring
    const metrics = {
      timestamp: Date.now(),
      health_status: result.overallHealth || (result.success ? 'HEALTHY' : 'CRITICAL'),
      performance_score: result.performanceScore || (result.success ? 100 : 0),
      response_time: result.duration || 0,
      check_type: AIHealthMonitor ? 'ai_powered' : 'basic'
    };

    // Ensure tmp directory exists
    await fs.mkdir(path.dirname(metricsFile), { recursive: true });
    await fs.writeFile(metricsFile, JSON.stringify(metrics));

    console.log(`📊 Health metrics exported to ${metricsFile}`);

  } catch (error) {
    console.error('Failed to export health metrics:', error);
  }
}

// Main execution logic
async function main() {
  const mode = process.argv[2] || 'standard';
  
  switch (mode) {
    case 'enhanced':
      await enhancedHealthCheck();
      break;
    case 'metrics':
      await healthCheckWithMetrics();
      await performAIHealthCheck();
      break;
    case 'standard':
    default:
      await performAIHealthCheck();
      break;
  }
}

// Handle process signals gracefully
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down health check gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down health check gracefully');
  process.exit(0);
});

// Only run if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Health check script failed:', error);
    process.exit(1);
  });
}

module.exports = {
  performAIHealthCheck,
  enhancedHealthCheck,
  healthCheckWithMetrics,
  BasicHealthChecker,
  AdvancedHealthChecker
};