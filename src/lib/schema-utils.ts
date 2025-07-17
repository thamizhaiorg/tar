/**
 * Schema Utilities
 * 
 * This module provides convenient utilities and CLI-like functions
 * for analyzing and validating the schema structure.
 */

import { SchemaAnalyzer, type SchemaAnalysisReport, type SchemaInconsistency } from './schema-analysis';
import { SchemaComparator, SchemaSnapshotManager, type SchemaSnapshot, type SchemaComparison } from './schema-comparison';
import schema from '../../instant.schema';

/**
 * Main utility class for schema operations
 */
export class SchemaUtils {
  private static analyzer = new SchemaAnalyzer();

  /**
   * Runs a complete schema analysis and returns the report
   */
  public static analyzeCurrentSchema(): SchemaAnalysisReport {
    console.log('🔍 Analyzing current schema...');
    const report = this.analyzer.analyzeSchema();
    
    console.log('\n📊 Schema Analysis Report');
    console.log('========================');
    console.log(`Total Entities: ${report.totalEntities}`);
    console.log(`Total Fields: ${report.totalFields}`);
    console.log(`Total Relationships: ${report.totalRelationships}`);
    console.log(`Total Inconsistencies: ${report.inconsistencies.length}`);
    
    console.log('\n🚨 Issues Summary:');
    console.log(`- Field Naming Issues: ${report.summary.fieldNamingIssues}`);
    console.log(`- Duplicate Fields: ${report.summary.duplicateFields}`);
    console.log(`- Data Type Issues: ${report.summary.dataTypeIssues}`);
    console.log(`- Missing Relationships: ${report.summary.missingRelationships}`);
    console.log(`- Duplicate Entities: ${report.summary.duplicateEntities}`);
    
    return report;
  }

  /**
   * Displays detailed inconsistencies grouped by severity
   */
  public static displayInconsistencies(inconsistencies: SchemaInconsistency[]): void {
    const groupedBySeverity = this.groupInconsistenciesBySeverity(inconsistencies);
    
    for (const [severity, issues] of Object.entries(groupedBySeverity)) {
      if (issues.length === 0) continue;
      
      console.log(`\n🔴 ${severity.toUpperCase()} Issues (${issues.length}):`);
      console.log('─'.repeat(50));
      
      for (const issue of issues) {
        console.log(`\n📍 ${issue.entity}${issue.field ? `.${issue.field}` : ''}`);
        console.log(`   Issue: ${issue.issue}`);
        console.log(`   Suggestion: ${issue.suggestion}`);
      }
    }
  }

  /**
   * Groups inconsistencies by severity
   */
  private static groupInconsistenciesBySeverity(inconsistencies: SchemaInconsistency[]): Record<string, SchemaInconsistency[]> {
    return inconsistencies.reduce((groups, issue) => {
      if (!groups[issue.severity]) {
        groups[issue.severity] = [];
      }
      groups[issue.severity].push(issue);
      return groups;
    }, {} as Record<string, SchemaInconsistency[]>);
  }

  /**
   * Displays entity-specific analysis
   */
  public static displayEntityAnalysis(entityName: string, report: SchemaAnalysisReport): void {
    const entity = report.entities.find(e => e.name === entityName);
    
    if (!entity) {
      console.log(`❌ Entity "${entityName}" not found`);
      return;
    }
    
    console.log(`\n📋 Entity Analysis: ${entityName}`);
    console.log('═'.repeat(40));
    console.log(`Fields: ${entity.fieldCount}`);
    console.log(`Relationships: ${entity.relationships.length}`);
    console.log(`Issues: ${entity.inconsistencies.length}`);
    
    if (entity.fields.length > 0) {
      console.log('\n📝 Fields:');
      for (const field of entity.fields) {
        const flags = [];
        if (field.isIndexed) flags.push('indexed');
        if (field.isUnique) flags.push('unique');
        if (!field.isOptional) flags.push('required');
        
        const flagsStr = flags.length > 0 ? ` (${flags.join(', ')})` : '';
        console.log(`  - ${field.name}: ${field.type}${flagsStr}`);
      }
    }
    
    if (entity.relationships.length > 0) {
      console.log('\n🔗 Relationships:');
      for (const relationship of entity.relationships) {
        console.log(`  - ${relationship}`);
      }
    }
    
    if (entity.inconsistencies.length > 0) {
      console.log('\n⚠️  Issues:');
      for (const issue of entity.inconsistencies) {
        console.log(`  - ${issue.issue}`);
        console.log(`    💡 ${issue.suggestion}`);
      }
    }
  }

  /**
   * Creates a snapshot of the current schema
   */
  public static createCurrentSnapshot(version: string = '1.0.0'): SchemaSnapshot {
    console.log(`📸 Creating schema snapshot (version ${version})...`);
    const snapshot = SchemaSnapshotManager.createSnapshot(schema, version);
    console.log(`✅ Snapshot created with checksum: ${snapshot.checksum}`);
    return snapshot;
  }

  /**
   * Compares two schema snapshots
   */
  public static compareSnapshots(oldSnapshot: SchemaSnapshot, newSnapshot: SchemaSnapshot): SchemaComparison {
    console.log('🔄 Comparing schema snapshots...');
    const comparison = SchemaComparator.compareSchemas(oldSnapshot, newSnapshot);
    
    console.log('\n📊 Comparison Results');
    console.log('====================');
    console.log(`Changes Detected: ${comparison.hasChanges ? 'Yes' : 'No'}`);
    console.log(`Total Changes: ${comparison.changes.length}`);
    console.log(`Breaking Changes: ${comparison.breakingChanges.length}`);
    console.log(`Migration Required: ${comparison.migrationRequired ? 'Yes' : 'No'}`);
    
    if (comparison.changes.length > 0) {
      console.log('\n📈 Change Summary:');
      console.log(`- Entities Added: ${comparison.summary.entitiesAdded}`);
      console.log(`- Entities Removed: ${comparison.summary.entitiesRemoved}`);
      console.log(`- Fields Added: ${comparison.summary.fieldsAdded}`);
      console.log(`- Fields Removed: ${comparison.summary.fieldsRemoved}`);
      console.log(`- Fields Modified: ${comparison.summary.fieldsModified}`);
      console.log(`- Relationships Added: ${comparison.summary.relationshipsAdded}`);
      console.log(`- Relationships Removed: ${comparison.summary.relationshipsRemoved}`);
    }
    
    return comparison;
  }

  /**
   * Displays detailed change information
   */
  public static displayChanges(comparison: SchemaComparison): void {
    if (!comparison.hasChanges) {
      console.log('✅ No changes detected');
      return;
    }
    
    const groupedChanges = this.groupChangesByType(comparison.changes);
    
    for (const [changeType, changes] of Object.entries(groupedChanges)) {
      if (changes.length === 0) continue;
      
      console.log(`\n🔄 ${changeType.replace('_', ' ').toUpperCase()} (${changes.length}):`);
      console.log('─'.repeat(50));
      
      for (const change of changes) {
        const impactIcon = change.impact === 'breaking' ? '🚨' : change.impact === 'enhancement' ? '✨' : '🔧';
        console.log(`\n${impactIcon} ${change.description}`);
        console.log(`   Entity: ${change.entity}${change.field ? `.${change.field}` : ''}`);
        console.log(`   Impact: ${change.impact}`);
        
        if (change.oldValue !== undefined) {
          console.log(`   Old Value: ${JSON.stringify(change.oldValue)}`);
        }
        if (change.newValue !== undefined) {
          console.log(`   New Value: ${JSON.stringify(change.newValue)}`);
        }
      }
    }
  }

  /**
   * Groups changes by type
   */
  private static groupChangesByType(changes: any[]): Record<string, any[]> {
    return changes.reduce((groups, change) => {
      if (!groups[change.type]) {
        groups[change.type] = [];
      }
      groups[change.type].push(change);
      return groups;
    }, {} as Record<string, any[]>);
  }

  /**
   * Validates a specific field name and type
   */
  public static validateField(fieldName: string, dataType: string): void {
    console.log(`🔍 Validating field: ${fieldName} (${dataType})`);
    
    const namingValidation = SchemaAnalyzer.validateFieldNaming(fieldName);
    const typeValidation = SchemaAnalyzer.validateDataType(fieldName, dataType);
    
    if (namingValidation.isValid && typeValidation.isValid) {
      console.log('✅ Field validation passed');
    } else {
      console.log('❌ Field validation failed:');
      
      if (!namingValidation.isValid) {
        console.log('  Naming Issues:');
        for (const issue of namingValidation.issues) {
          console.log(`    - ${issue}`);
        }
      }
      
      if (!typeValidation.isValid) {
        console.log('  Type Issues:');
        for (const issue of typeValidation.issues) {
          console.log(`    - ${issue}`);
        }
      }
    }
  }

  /**
   * Generates a summary report for the most critical issues
   */
  public static generateCriticalIssuesReport(report: SchemaAnalysisReport): void {
    const criticalIssues = report.inconsistencies.filter(issue => issue.severity === 'high');
    
    console.log('\n🚨 CRITICAL ISSUES REPORT');
    console.log('=========================');
    
    if (criticalIssues.length === 0) {
      console.log('✅ No critical issues found!');
      return;
    }
    
    console.log(`Found ${criticalIssues.length} critical issues that require immediate attention:\n`);
    
    // Group by type
    const groupedIssues = criticalIssues.reduce((groups, issue) => {
      if (!groups[issue.type]) {
        groups[issue.type] = [];
      }
      groups[issue.type].push(issue);
      return groups;
    }, {} as Record<string, SchemaInconsistency[]>);
    
    for (const [issueType, issues] of Object.entries(groupedIssues)) {
      console.log(`📍 ${issueType.replace('_', ' ').toUpperCase()}:`);
      for (const issue of issues) {
        console.log(`   • ${issue.entity}${issue.field ? `.${issue.field}` : ''}: ${issue.issue}`);
        console.log(`     💡 ${issue.suggestion}`);
      }
      console.log('');
    }
    
    console.log('⚠️  These issues should be resolved before proceeding with schema optimization.');
  }

  /**
   * Runs a quick health check on the schema
   */
  public static runHealthCheck(): void {
    console.log('🏥 Running Schema Health Check...');
    console.log('=================================\n');
    
    const report = this.analyzeCurrentSchema();
    
    // Calculate health score
    const totalIssues = report.inconsistencies.length;
    const criticalIssues = report.inconsistencies.filter(i => i.severity === 'high').length;
    const mediumIssues = report.inconsistencies.filter(i => i.severity === 'medium').length;
    
    const healthScore = Math.max(0, 100 - (criticalIssues * 10) - (mediumIssues * 5) - (totalIssues * 2));
    
    console.log(`\n🎯 Schema Health Score: ${healthScore}/100`);
    
    if (healthScore >= 90) {
      console.log('🟢 Excellent - Schema is in great shape!');
    } else if (healthScore >= 70) {
      console.log('🟡 Good - Minor improvements recommended');
    } else if (healthScore >= 50) {
      console.log('🟠 Fair - Several issues need attention');
    } else {
      console.log('🔴 Poor - Significant improvements required');
    }
    
    // Show top recommendations
    if (totalIssues > 0) {
      console.log('\n🔧 Top Recommendations:');
      const topIssues = report.inconsistencies
        .sort((a, b) => {
          const severityOrder = { high: 3, medium: 2, low: 1 };
          return severityOrder[b.severity] - severityOrder[a.severity];
        })
        .slice(0, 5);
      
      for (let i = 0; i < topIssues.length; i++) {
        const issue = topIssues[i];
        console.log(`${i + 1}. ${issue.suggestion} (${issue.entity}${issue.field ? `.${issue.field}` : ''})`);
      }
    }
  }
}