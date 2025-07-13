// Product service for business logic separation
import { db, Product } from '../lib/instant';
import { log, trackError, PerformanceMonitor } from '../lib/logger';
import { id } from '@instantdb/react-native';

export interface ProductFilters {
  search?: string;
  status?: 'All' | 'Active' | 'Draft';
  category?: string;
  brand?: string;
  tags?: string[];
  priceRange?: {
    min?: number;
    max?: number;
  };
}

export interface ProductSortOptions {
  field: 'title' | 'price' | 'createdAt' | 'updatedAt' | 'stock';
  direction: 'asc' | 'desc';
}

export class ProductService {
  private static instance: ProductService;

  private constructor() {}

  static getInstance(): ProductService {
    if (!ProductService.instance) {
      ProductService.instance = new ProductService();
    }
    return ProductService.instance;
  }

  // Filter products based on criteria
  filterProducts(products: Product[], filters: ProductFilters): Product[] {
    return PerformanceMonitor.measure('filter-products', () => {
      let filtered = products;

      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filtered = filtered.filter(product => {
          const title = (product.title || '').toLowerCase();
          const category = (product.category || '').toLowerCase();
          const brand = (product.brand || '').toLowerCase();
          const tags = Array.isArray(product.tags) 
            ? product.tags.join(' ').toLowerCase()
            : (typeof product.tags === 'string' ? product.tags.toLowerCase() : '');

          return title.includes(searchTerm) ||
                 category.includes(searchTerm) ||
                 brand.includes(searchTerm) ||
                 tags.includes(searchTerm);
        });
      }

      // Status filter
      if (filters.status && filters.status !== 'All') {
        filtered = filtered.filter(product => {
          const status = product.publish === false ? 'Draft' : 'Active';
          return status === filters.status;
        });
      }

      // Category filter
      if (filters.category) {
        filtered = filtered.filter(product => product.category === filters.category);
      }

      // Brand filter
      if (filters.brand) {
        filtered = filtered.filter(product => product.brand === filters.brand);
      }

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        filtered = filtered.filter(product => {
          const productTags = Array.isArray(product.tags) ? product.tags : [];
          return filters.tags!.some(tag => productTags.includes(tag));
        });
      }

      // Price range filter
      if (filters.priceRange) {
        filtered = filtered.filter(product => {
          const price = product.price || 0;
          const { min, max } = filters.priceRange!;
          
          if (min !== undefined && price < min) return false;
          if (max !== undefined && price > max) return false;
          
          return true;
        });
      }

      return filtered;
    });
  }

  // Sort products
  sortProducts(products: Product[], sortOptions: ProductSortOptions): Product[] {
    return PerformanceMonitor.measure('sort-products', () => {
      return [...products].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortOptions.field) {
          case 'title':
            aValue = (a.title || '').toLowerCase();
            bValue = (b.title || '').toLowerCase();
            break;
          case 'price':
            aValue = a.price || 0;
            bValue = b.price || 0;
            break;
          case 'createdAt':
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
            break;
          case 'updatedAt':
            aValue = new Date(a.updatedAt || a.createdAt).getTime();
            bValue = new Date(b.updatedAt || b.createdAt).getTime();
            break;
          case 'stock':
            aValue = a.stock || 0;
            bValue = b.stock || 0;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) {
          return sortOptions.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortOptions.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    });
  }

  // Create a new product
  async createProduct(productData: Partial<Product>, storeId: string): Promise<{ success: boolean; productId?: string; error?: string }> {
    try {
      log.info('Creating product', 'ProductService', { productData, storeId });

      const newId = id();
      const timestamp = Date.now();

      const product = {
        ...productData,
        id: newId,
        storeId,
        createdAt: timestamp,
        updatedAt: timestamp,
        publish: productData.publish !== undefined ? productData.publish : true,
      };

      await db.transact([
        db.tx.products[newId].update(product)
      ]);

      log.info('Product created successfully', 'ProductService', { productId: newId });
      return { success: true, productId: newId };
    } catch (error) {
      trackError(error as Error, 'ProductService', { operation: 'createProduct', productData, storeId });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Update an existing product
  async updateProduct(productId: string, updates: Partial<Product>): Promise<{ success: boolean; error?: string }> {
    try {
      log.info('Updating product', 'ProductService', { productId, updates });

      const updateData = {
        ...updates,
        updatedAt: Date.now(),
      };

      await db.transact([
        db.tx.products[productId].update(updateData)
      ]);

      log.info('Product updated successfully', 'ProductService', { productId });
      return { success: true };
    } catch (error) {
      trackError(error as Error, 'ProductService', { operation: 'updateProduct', productId, updates });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Delete a product
  async deleteProduct(productId: string): Promise<{ success: boolean; error?: string }> {
    try {
      log.info('Deleting product', 'ProductService', { productId });

      await db.transact([
        db.tx.products[productId].delete()
      ]);

      log.info('Product deleted successfully', 'ProductService', { productId });
      return { success: true };
    } catch (error) {
      trackError(error as Error, 'ProductService', { operation: 'deleteProduct', productId });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Bulk delete products
  async bulkDeleteProducts(productIds: string[]): Promise<{ success: boolean; error?: string }> {
    try {
      log.info('Bulk deleting products', 'ProductService', { productIds, count: productIds.length });

      const transactions = productIds.map(id => db.tx.products[id].delete());
      await db.transact(transactions);

      log.info('Products bulk deleted successfully', 'ProductService', { count: productIds.length });
      return { success: true };
    } catch (error) {
      trackError(error as Error, 'ProductService', { operation: 'bulkDeleteProducts', productIds });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Duplicate a product
  async duplicateProduct(productId: string, storeId: string): Promise<{ success: boolean; productId?: string; error?: string }> {
    try {
      log.info('Duplicating product', 'ProductService', { productId, storeId });

      // This would need to fetch the original product first
      // For now, this is a placeholder implementation
      const newId = id();
      const timestamp = Date.now();

      // In a real implementation, you'd fetch the original product and copy its data
      const duplicatedProduct = {
        id: newId,
        storeId,
        title: 'Copy of Product', // This would be the original title with "Copy of" prefix
        createdAt: timestamp,
        updatedAt: timestamp,
        publish: false, // Duplicated products start as drafts
      };

      await db.transact([
        db.tx.products[newId].update(duplicatedProduct)
      ]);

      log.info('Product duplicated successfully', 'ProductService', { originalId: productId, newId });
      return { success: true, productId: newId };
    } catch (error) {
      trackError(error as Error, 'ProductService', { operation: 'duplicateProduct', productId, storeId });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get product statistics
  getProductStats(products: Product[]): {
    total: number;
    active: number;
    draft: number;
    lowStock: number;
    outOfStock: number;
    averagePrice: number;
  } {
    return PerformanceMonitor.measure('calculate-product-stats', () => {
      const stats = {
        total: products.length,
        active: 0,
        draft: 0,
        lowStock: 0,
        outOfStock: 0,
        averagePrice: 0,
      };

      let totalPrice = 0;
      let priceCount = 0;

      products.forEach(product => {
        // Status counts
        if (product.publish === false) {
          stats.draft++;
        } else {
          stats.active++;
        }

        // Stock counts
        const stock = product.stock || 0;
        if (stock === 0) {
          stats.outOfStock++;
        } else if (stock <= 5) { // Assuming low stock threshold is 5
          stats.lowStock++;
        }

        // Price calculation
        if (product.price && product.price > 0) {
          totalPrice += product.price;
          priceCount++;
        }
      });

      stats.averagePrice = priceCount > 0 ? totalPrice / priceCount : 0;

      return stats;
    });
  }
}
