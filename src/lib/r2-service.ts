import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Config, validateR2Config, generateFileKey, getPublicUrl } from './r2-config';
import { log, trackError, PerformanceMonitor } from './logger';

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

export interface MediaFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

class R2Service {
  private client: S3Client | null = null;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    // ...removed debug log...

    if (!validateR2Config()) {
      console.error('❌ R2Service: R2 configuration is incomplete');
      return;
    }

    // ...removed debug log...

    this.client = new S3Client({
      region: r2Config.region,
      endpoint: r2Config.endpoint,
      credentials: {
        accessKeyId: r2Config.accessKeyId,
        secretAccessKey: r2Config.secretAccessKey,
      },
      forcePathStyle: true, // Required for R2
    });

    // ...removed debug log...
  }

  async uploadFile(file: MediaFile, prefix: string = 'media'): Promise<UploadResult> {
    if (!this.client) {
      // Removed error log
      return { success: false, error: 'R2 client not initialized' };
    }

    // Removed info log

    try {
      return await (async () => {
        // Generate unique key for the file
        const key = generateFileKey(file.name, prefix);
        // Removed debug log

      // Read file content - use different approach for React Native
      const response = await fetch(file.uri);

      // For React Native, we need to handle the response differently
      let body: Uint8Array;

      try {
        // Try web approach first
        const buffer = await response.arrayBuffer();
        body = new Uint8Array(buffer);
      } catch (error) {
        // Fallback for React Native - use blob and convert to base64
        try {
          const blob = await response.blob();

          // Use a different approach for React Native
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              // Remove data URL prefix (data:image/jpeg;base64,)
              const base64 = result.split(',')[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          // Convert base64 to Uint8Array
          const binaryString = atob(base64Data);
          body = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            body[i] = binaryString.charCodeAt(i);
          }
        } catch (blobError) {
          // Final fallback - read as text and convert
          const text = await response.text();
          body = new TextEncoder().encode(text);
        }
      }

      // Upload to R2
      const command = new PutObjectCommand({
        Bucket: r2Config.bucketName,
        Key: key,
        Body: body,
        ContentType: file.type,
        ContentLength: body.byteLength,
      });

        await this.client.send(command);

        // Return success with public URL
        const url = getPublicUrl(key);
        // ...removed debug log...
        // Removed info log
        return { success: true, url, key };
      });

    } catch (error) {
      trackError(error as Error, 'R2Service', {
        fileName: file.name,
        fileSize: file.size
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    if (!this.client) {
      // Removed error log
      return false;
    }

    // Removed info log

    try {
      const command = new DeleteObjectCommand({
        Bucket: r2Config.bucketName,
        Key: key,
      });

      await this.client.send(command);
      // Removed info log
      return true;

    } catch (error) {
      console.error('Delete failed:', error);
      return false;
    }
  }

  async fileExists(key: string): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: r2Config.bucketName,
        Key: key,
      });

      await this.client.send(command);
      return true;

    } catch (error) {
      return false;
    }
  }

  // Upload multiple files
  async uploadFiles(files: MediaFile[], prefix: string = 'media'): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    
    for (const file of files) {
      const result = await this.uploadFile(file, prefix);
      results.push(result);
    }

    return results;
  }

  // Extract key from URL
  extractKeyFromUrl(url: string): string | null {
    try {
      // ...removed debug log...
      const urlObj = new URL(url);
      const key = urlObj.pathname.substring(1); // Remove leading slash
      // ...removed debug log...
      return key;
    } catch (error) {
      // ...removed debug log...
      return null;
    }
  }

  // Generate structured path for file management
  generateStructuredPath(
    userId: string,
    category: string,
    fileName: string | undefined,
    reference?: string
  ): string {
    // Sanitize user ID (remove symbols)
    const sanitizedUserId = userId.replace(/[^a-zA-Z0-9]/g, '');

    // Sanitize category name (lowercase, no spaces/symbols)
    let sanitizedCategory = (category || 'general').toLowerCase().replace(/[^a-zA-Z0-9]/g, '');

    // If reference is provided, use it to determine more specific category
    if (reference) {
      if (reference.includes('product')) sanitizedCategory = 'products';
      else if (reference.includes('collection')) sanitizedCategory = 'collections';
      else if (reference.includes('option')) sanitizedCategory = 'options';
    }

    // Generate random number for uniqueness
    const randomNumber = Math.floor(Math.random() * 1000000000);

    // Clean filename (remove spaces and special characters, keep extension)
    const safeName = fileName || `file_${Date.now()}`;
    const cleanFileName = safeName.toLowerCase().replace(/[^a-zA-Z0-9.-]/g, '');

    return `${sanitizedUserId}/${sanitizedCategory}/${randomNumber}/${cleanFileName}`;
  }

  // Upload file with structured path
  async uploadFileWithStructuredPath(
    file: MediaFile,
    userId: string,
    category: string,
    reference?: string
  ): Promise<UploadResult> {
    // Removed console log

    const structuredPath = this.generateStructuredPath(userId, category, file.name, reference);
    // Removed console log

    // Use the structured path as the key directly
    return this.uploadFileWithCustomKey(file, structuredPath);
  }

  // Upload file with custom key (internal method)
  private async uploadFileWithCustomKey(file: MediaFile, key: string): Promise<UploadResult> {
    // Removed console log

    if (!this.client) {
      console.error('❌ R2Service: R2 client not initialized');
      // Removed error log
      return { success: false, error: 'R2 client not initialized' };
    }

    // Removed console log
    // Removed info log

    try {
      return await (async () => {
        // Read file content - use different approach for React Native
        const response = await fetch(file.uri);

        // For React Native, we need to handle the response differently
        let body: Uint8Array;

        try {
          // Try to get as array buffer first
          const arrayBuffer = await response.arrayBuffer();
          body = new Uint8Array(arrayBuffer);
        } catch (arrayBufferError) {
          try {
            // Fallback to blob
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            body = new Uint8Array(arrayBuffer);
          } catch (blobError) {
            // Final fallback - read as text and convert
            const text = await response.text();
            body = new TextEncoder().encode(text);
          }
        }

        // Upload to R2
        const command = new PutObjectCommand({
          Bucket: r2Config.bucketName,
          Key: key,
          Body: body,
          ContentType: file.type,
          ContentLength: body.byteLength,
        });

        await this.client.send(command);

        // Return success with public URL
        const url = getPublicUrl(key);
        // Removed info log
        return { success: true, url, key };
      });

    } catch (error) {
      trackError(error as Error, 'R2Service', {
        fileName: file.name,
        fileSize: file.size,
        customKey: key
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  // Generate signed URL for reading files (for private buckets)
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string | null> {
    // Removed console log

    if (!this.client) {
      console.error('❌ R2Service: R2 client not initialized');
      return null;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: r2Config.bucketName,
        Key: key,
      });

      // Removed console log

      const signedUrl = await getSignedUrl(this.client, command, { expiresIn });
      // Removed console log
      return signedUrl;
    } catch (error) {
      console.error('❌ R2Service: Failed to generate signed URL:', { key, error });
      return null;
    }
  }

  // Get accessible URL (signed URL for private buckets, public URL for public buckets)
  async getAccessibleUrl(key: string): Promise<string | null> {
    // For now, always use signed URLs since the bucket appears to be private
    return this.getSignedUrl(key);
  }

  // File management utilities

  // Replace existing file (delete old, upload new)
  async replaceFile(
    oldKey: string,
    newFile: MediaFile,
    userId: string,
    category: string,
    reference?: string
  ): Promise<UploadResult> {
    try {
      // Upload new file first
      const uploadResult = await this.uploadFileWithStructuredPath(newFile, userId, category, reference);

      if (uploadResult.success) {
        // Delete old file after successful upload
        await this.deleteFile(oldKey);
        // Removed info log
      }

      return uploadResult;
    } catch (error) {
      trackError(error as Error, 'R2Service', {
        oldKey,
        newFileName: newFile.name
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'File replacement failed'
      };
    }
  }

  // Check if file is referenced (utility for safe deletion)
  async isFileReferenced(fileUrl: string, db: any): Promise<boolean> {
    try {
      const key = this.extractKeyFromUrl(fileUrl);
      if (!key) return false;

      // Check if file is referenced in products, collections, or options
      // This would need to be implemented based on your specific schema
      // For now, return true to prevent accidental deletion
      return true;
    } catch (error) {
      log.error('Error checking file references', 'R2Service', { error });
      return true; // Err on the side of caution
    }
  }

  // Batch delete files (for cleanup operations)
  async deleteFiles(keys: string[]): Promise<{ success: boolean; deletedKeys: string[]; errors: string[] }> {
    const deletedKeys: string[] = [];
    const errors: string[] = [];

    for (const key of keys) {
      try {
        const success = await this.deleteFile(key);
        if (success) {
          deletedKeys.push(key);
        } else {
          errors.push(`Failed to delete ${key}`);
        }
      } catch (error) {
        errors.push(`Error deleting ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: errors.length === 0,
      deletedKeys,
      errors
    };
  }

  // Get file metadata without downloading
  async getFileMetadata(key: string): Promise<{ size?: number; lastModified?: Date; contentType?: string } | null> {
    if (!this.client) {
      return null;
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: r2Config.bucketName,
        Key: key,
      });

      const response = await this.client.send(command);

      return {
        size: response.ContentLength,
        lastModified: response.LastModified,
        contentType: response.ContentType
      };
    } catch (error) {
      log.error(`Failed to get metadata for ${key}`, 'R2Service', { error });
      return null;
    }
  }

  // Generate unique handle for file entity
  generateFileHandle(fileName: string | undefined, userId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const sanitizedUserId = userId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);

    // Handle undefined or null fileName
    const safeName = fileName || `file_${timestamp}`;
    const cleanName = safeName.replace(/[^a-zA-Z0-9.-]/g, '').toLowerCase();
    const nameWithoutExt = cleanName.split('.')[0];

    return `${sanitizedUserId}-${nameWithoutExt}-${timestamp}-${random}`;
  }
}

// Export singleton instance
export const r2Service = new R2Service();
export default r2Service;
