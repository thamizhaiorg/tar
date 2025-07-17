/**
 * Demo Script for Schema Analysis Utilities
 * 
 * This script demonstrates the capabilities of the schema analysis utilities
 * without requiring the full InstantDB schema to be loaded.
 */

import { SchemaValidator, type SchemaInconsistency } from './schema-analysis';

/**
 * Demonstrates field naming validation
 */
export function demoFieldNamingValidation(): void {
  console.log('🔍 Field Naming Validation Demo');
  console.log('===============================\n');

  const testFields = [
    { name: 'createdAt', type: 'date' },
    { name: 'createdat', type: 'date' },
    { name: 'created_at', type: 'date' },
    { name: 'orderNumber', type: 'string' },
    { name: 'order-number', type: 'string' },
    { name: 'userId', type: 'string' },
    { name: 'user_id', type: 'string' }
  ];

  for (const field of testFields) {
    const result = SchemaValidator.validateFieldNaming(field.name);
    const status = result.isValid ? '✅' : '❌';
    
    console.log(`${status} ${field.name}`);
    if (!result.isValid) {
      for (const issue of result.issues) {
        console.log(`   - ${issue}`);
      }
    }
    console.log('');
  }
}

/**
 * Demonstrates data type validation
 */
export function demoDataTypeValidation(): void {
  console.log('🔍 Data Type Validation Demo');
  console.log('============================\n');

  const testFields = [
    { name: 'createdAt', type: 'date' },
    { name: 'createdAt', type: 'string' },
    { name: 'price', type: 'number' },
    { name: 'price', type: 'string' },
    { name: 'metafields', type: 'json' },
    { name: 'metafields', type: 'any' },
    { name: 'title', type: 'string' }
  ];

  for (const field of testFields) {
    const result = SchemaValidator.validateDataType(field.name, field.type);
    const status = result.isValid ? '✅' : '❌';
    
    console.log(`${status} ${field.name}: ${field.type}`);
    if (!result.isValid) {
      for (const issue of result.issues) {
        console.log(`   - ${issue}`);
      }
    }
    console.log('');
  }
}

/**
 * Demonstrates relationship validation
 */
export function demoRelationshipValidation(): void {
  console.log('🔍 Relationship Validation Demo');
  console.log('===============================\n');

  const testRelationships = [
    { entity: 'products', field: 'brandId', related: 'brands' },
    { entity: 'products', field: 'brand', related: 'brands' },
    { entity: 'orders', field: 'customerId', related: 'customers' },
    { entity: 'orders', field: 'customerId', related: 'nonexistent' },
    { entity: 'items', field: 'productId', related: 'products' }
  ];

  for (const rel of testRelationships) {
    const result = SchemaValidator.validateRelationship(rel.entity, rel.field, rel.related);
    const status = result.isValid ? '✅' : '❌';
    
    console.log(`${status} ${rel.entity}.${rel.field} -> ${rel.related}`);
    if (!result.isValid) {
      for (const issue of result.issues) {
        console.log(`   - ${issue}`);
      }
    }
    console.log('');
  }
}

/**
 * Simulates schema inconsistencies that would be found in the actual schema
 */
export function demoSchemaInconsistencies(): void {
  console.log('🚨 Common Schema Inconsistencies Demo');
  console.log('====================================\n');

  // Simulate the types of inconsistencies we'd find in the real schema
  const mockInconsistencies: SchemaInconsistency[] = [
    {
      type: 'field_naming',
      entity: 'orders',
      field: 'createdat',
      issue: 'Inconsistent timestamp field naming',
      suggestion: 'Rename "createdat" to "createdAt" for consistency',
      severity: 'medium'
    },
    {
      type: 'duplicate_field',
      entity: 'orderitems',
      field: 'taxamt',
      issue: 'Duplicate field: both "taxamt" and "taxAmount" exist',
      suggestion: 'Remove "taxamt" and use "taxAmount" consistently',
      severity: 'high'
    },
    {
      type: 'missing_relationship',
      entity: 'products',
      field: 'brand',
      issue: 'Field "brand" stores string instead of relationship',
      suggestion: 'Convert to "brandId" relationship with brands entity',
      severity: 'high'
    },
    {
      type: 'data_type',
      entity: 'customers',
      field: 'addresses',
      issue: 'Using "any" type for structured data',
      suggestion: 'Change "any" type to "json" for better type safety',
      severity: 'medium'
    },
    {
      type: 'duplicate_entity',
      entity: 'stores',
      issue: 'Duplicate entity: both "stores" and "store" exist',
      suggestion: 'Remove "stores" entity and use "store" consistently',
      severity: 'high'
    }
  ];

  // Group by severity
  const groupedBySeverity = mockInconsistencies.reduce((groups, issue) => {
    if (!groups[issue.severity]) {
      groups[issue.severity] = [];
    }
    groups[issue.severity].push(issue);
    return groups;
  }, {} as Record<string, SchemaInconsistency[]>);

  for (const [severity, issues] of Object.entries(groupedBySeverity)) {
    console.log(`🔴 ${severity.toUpperCase()} Issues (${issues.length}):`);
    console.log('─'.repeat(50));
    
    for (const issue of issues) {
      console.log(`\n📍 ${issue.entity}${issue.field ? `.${issue.field}` : ''}`);
      console.log(`   Issue: ${issue.issue}`);
      console.log(`   💡 ${issue.suggestion}`);
    }
    console.log('');
  }
}

/**
 * Runs all demo functions
 */
export function runAllDemos(): void {
  console.log('🚀 Schema Analysis Utilities Demo');
  console.log('=================================\n');

  demoFieldNamingValidation();
  demoDataTypeValidation();
  demoRelationshipValidation();
  demoSchemaInconsistencies();

  console.log('✅ Demo completed! These utilities can help identify and fix schema inconsistencies.');
  console.log('\n🎯 Next Steps:');
  console.log('- Run the actual schema analysis with: npm run analyze-schema');
  console.log('- Use these utilities in your schema optimization tasks');
  console.log('- Create snapshots before making changes for comparison');
}

// Run demo if this file is executed directly
if (require.main === module) {
  runAllDemos();
}