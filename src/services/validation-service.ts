// Validation service for form and data validation
import { log } from '../lib/logger';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings?: Record<string, string>;
}

export interface ProductValidationData {
  title?: string;
  price?: number;
  cost?: number;
  stock?: number;
  weight?: number;
  email?: string;
  phone?: string;
  website?: string;
  tags?: string[];
}

export interface CollectionValidationData {
  name?: string;
  description?: string;
}

export interface StoreValidationData {
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
}

export class ValidationService {
  private static instance: ValidationService;

  private constructor() {}

  static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService();
    }
    return ValidationService.instance;
  }

  // Email validation
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Phone validation (basic)
  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  // URL validation
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Validate product data
  validateProduct(data: ProductValidationData, isRequired: boolean = false): ValidationResult {
    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};

    // Title validation
    if (isRequired && !data.title?.trim()) {
      errors.title = 'Product title is required';
    } else if (data.title && data.title.length > 255) {
      errors.title = 'Product title must be less than 255 characters';
    } else if (data.title && data.title.length < 2) {
      errors.title = 'Product title must be at least 2 characters';
    }

    // Price validation
    if (data.price !== undefined) {
      if (data.price < 0) {
        errors.price = 'Price cannot be negative';
      } else if (data.price > 999999.99) {
        errors.price = 'Price cannot exceed $999,999.99';
      } else if (data.price === 0) {
        warnings.price = 'Price is set to $0.00';
      }
    }

    // Cost validation
    if (data.cost !== undefined) {
      if (data.cost < 0) {
        errors.cost = 'Cost cannot be negative';
      } else if (data.cost > 999999.99) {
        errors.cost = 'Cost cannot exceed $999,999.99';
      }
    }

    // Price vs Cost validation
    if (data.price !== undefined && data.cost !== undefined && data.price > 0 && data.cost > 0) {
      if (data.cost > data.price) {
        warnings.cost = 'Cost is higher than selling price';
      }
    }

    // Stock validation
    if (data.stock !== undefined) {
      if (data.stock < 0) {
        errors.stock = 'Stock cannot be negative';
      } else if (data.stock > 999999) {
        errors.stock = 'Stock cannot exceed 999,999';
      } else if (data.stock === 0) {
        warnings.stock = 'Product is out of stock';
      } else if (data.stock <= 5) {
        warnings.stock = 'Low stock level';
      }
    }

    // Weight validation
    if (data.weight !== undefined) {
      if (data.weight < 0) {
        errors.weight = 'Weight cannot be negative';
      } else if (data.weight > 99999) {
        errors.weight = 'Weight seems unusually high';
      }
    }

    // Email validation
    if (data.email && !this.isValidEmail(data.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Phone validation
    if (data.phone && !this.isValidPhone(data.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }

    // Website validation
    if (data.website) {
      if (!data.website.startsWith('http://') && !data.website.startsWith('https://')) {
        data.website = 'https://' + data.website;
      }
      if (!this.isValidUrl(data.website)) {
        errors.website = 'Please enter a valid website URL';
      }
    }

    // Tags validation
    if (data.tags) {
      if (data.tags.length > 20) {
        errors.tags = 'Maximum 20 tags allowed';
      }
      
      const invalidTags = data.tags.filter(tag => tag.length > 50);
      if (invalidTags.length > 0) {
        errors.tags = 'Tags must be less than 50 characters each';
      }
    }

    const result: ValidationResult = {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings: Object.keys(warnings).length > 0 ? warnings : undefined,
    };

    log.debug('Product validation result', 'ValidationService', { data, result });
    return result;
  }

  // Validate collection data
  validateCollection(data: CollectionValidationData, isRequired: boolean = false): ValidationResult {
    const errors: Record<string, string> = {};

    // Name validation
    if (isRequired && !data.name?.trim()) {
      errors.name = 'Collection name is required';
    } else if (data.name && data.name.length > 255) {
      errors.name = 'Collection name must be less than 255 characters';
    } else if (data.name && data.name.length < 2) {
      errors.name = 'Collection name must be at least 2 characters';
    }

    // Description validation
    if (data.description && data.description.length > 1000) {
      errors.description = 'Description must be less than 1000 characters';
    }

    const result: ValidationResult = {
      isValid: Object.keys(errors).length === 0,
      errors,
    };

    log.debug('Collection validation result', 'ValidationService', { data, result });
    return result;
  }

  // Validate store data
  validateStore(data: StoreValidationData, isRequired: boolean = false): ValidationResult {
    const errors: Record<string, string> = {};

    // Name validation
    if (isRequired && !data.name?.trim()) {
      errors.name = 'Store name is required';
    } else if (data.name && data.name.length > 255) {
      errors.name = 'Store name must be less than 255 characters';
    } else if (data.name && data.name.length < 2) {
      errors.name = 'Store name must be at least 2 characters';
    }

    // Email validation
    if (data.email && !this.isValidEmail(data.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Phone validation
    if (data.phone && !this.isValidPhone(data.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }

    // Website validation
    if (data.website) {
      if (!data.website.startsWith('http://') && !data.website.startsWith('https://')) {
        data.website = 'https://' + data.website;
      }
      if (!this.isValidUrl(data.website)) {
        errors.website = 'Please enter a valid website URL';
      }
    }

    // Address validation
    if (data.address && data.address.length > 500) {
      errors.address = 'Address must be less than 500 characters';
    }

    const result: ValidationResult = {
      isValid: Object.keys(errors).length === 0,
      errors,
    };

    log.debug('Store validation result', 'ValidationService', { data, result });
    return result;
  }

  // Validate file upload
  validateFile(file: { name: string; size: number; type: string }, maxSize: number = 10 * 1024 * 1024): ValidationResult {
    const errors: Record<string, string> = {};

    // File size validation
    if (file.size > maxSize) {
      errors.size = `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`;
    }

    // File name validation
    if (!file.name || file.name.length > 255) {
      errors.name = 'File name must be less than 255 characters';
    }

    // File type validation (basic)
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/mov', 'video/avi',
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      errors.type = 'File type not supported';
    }

    const result: ValidationResult = {
      isValid: Object.keys(errors).length === 0,
      errors,
    };

    log.debug('File validation result', 'ValidationService', { file, result });
    return result;
  }

  // Validate search query
  validateSearchQuery(query: string): ValidationResult {
    const errors: Record<string, string> = {};

    if (query.length > 100) {
      errors.query = 'Search query must be less than 100 characters';
    }

    // Check for potentially harmful characters
    const dangerousChars = /[<>\"'&]/;
    if (dangerousChars.test(query)) {
      errors.query = 'Search query contains invalid characters';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  // Batch validation
  validateBatch<T>(items: T[], validator: (item: T) => ValidationResult): { valid: T[]; invalid: Array<{ item: T; errors: Record<string, string> }> } {
    const valid: T[] = [];
    const invalid: Array<{ item: T; errors: Record<string, string> }> = [];

    items.forEach(item => {
      const result = validator(item);
      if (result.isValid) {
        valid.push(item);
      } else {
        invalid.push({ item, errors: result.errors });
      }
    });

    log.debug('Batch validation result', 'ValidationService', { 
      totalItems: items.length, 
      validCount: valid.length, 
      invalidCount: invalid.length 
    });

    return { valid, invalid };
  }
}
