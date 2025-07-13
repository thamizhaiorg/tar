import { useMemo, useEffect } from 'react';
import { db } from '../lib/instant';
import { useStore } from '../lib/store-context';
import { fileManager, FileRecord } from '../lib/file-manager';

export interface UseFilesOptions {
  reference?: string;
  type?: 'images' | 'videos' | 'documents' | 'all';
}

export interface UseFilesResult {
  files: FileRecord[];
  isLoading: boolean;
  error: any;
  uploadFile: (file: any, options?: { reference?: string; title?: string; alt?: string }) => Promise<{ success: boolean; fileRecord?: FileRecord; error?: string }>;
  replaceFile: (existingFileId: string, newFile: any, options?: { reference?: string; title?: string; alt?: string }) => Promise<{ success: boolean; fileRecord?: FileRecord; error?: string }>;
  updateFileMetadata: (fileId: string, updates: Partial<Pick<FileRecord, 'title' | 'alt' | 'reference'>>) => Promise<{ success: boolean; error?: string }>;
  getFilesByReference: (reference: string) => FileRecord[];
  isFileReferenced: (fileId: string) => boolean;
}

export function useFiles(options: UseFilesOptions = {}): UseFilesResult {
  const { currentStore } = useStore();
  const { user } = db.useAuth();

  // Query files for current store
  const query = currentStore?.id ? {
    files: {
      $: { where: { storeId: currentStore.id } }
    }
  } : {};

  console.log('🔍 useFiles HOOK: Database query:', {
    currentStoreId: currentStore?.id,
    query,
    hasCurrentStore: !!currentStore
  });

  const { data: filesData, isLoading, error } = db.useQuery(query);

  const allFiles = filesData?.files || [];

  // Add comprehensive logging
  useEffect(() => {
    console.log('🗂️ useFiles HOOK: Query result:', {
      currentStoreId: currentStore?.id,
      filesData,
      allFilesCount: allFiles.length,
      allFiles: allFiles.map(f => ({
        id: f.id,
        title: f.title,
        url: f.url,
        type: f.type,
        size: f.size,
        storeId: f.storeId,
        reference: f.reference
      })),
      isLoading,
      error,
      options
    });

    // Log specific details about image files
    const imageFiles = allFiles.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length > 0) {
      console.log('🖼️ useFiles HOOK: Image files found:', {
        imageCount: imageFiles.length,
        imageFiles: imageFiles.map(f => ({
          id: f.id,
          title: f.title,
          url: f.url,
          type: f.type
        }))
      });
    } else {
      console.log('❌ useFiles HOOK: No image files found');
    }
  }, [allFiles.length, currentStore?.id, isLoading, error, options]);

  // Filter files based on options
  const files = useMemo(() => {
    let filtered = allFiles;

    console.log('🔍 useFiles HOOK: Starting filter process:', {
      originalCount: allFiles.length,
      options,
      allFiles: allFiles.map(f => ({ id: f.id, title: f.title, type: f.type, reference: f.reference }))
    });

    // Filter by reference
    if (options.reference) {
      filtered = filtered.filter(file => file.reference === options.reference);
      console.log('📎 useFiles HOOK: After reference filter:', {
        reference: options.reference,
        filteredCount: filtered.length,
        filtered: filtered.map(f => ({ id: f.id, title: f.title, reference: f.reference }))
      });
    }

    // Filter by type
    if (options.type && options.type !== 'all') {
      const beforeTypeFilter = filtered.length;
      filtered = filtered.filter(file => {
        if (options.type === 'images') {
          return file.type.startsWith('image/') || file.type === 'image';
        }
        if (options.type === 'videos') {
          return file.type.startsWith('video/') || file.type === 'video';
        }
        if (options.type === 'documents') {
          return !file.type.startsWith('image/') &&
                 !file.type.startsWith('video/') &&
                 file.type !== 'image' &&
                 file.type !== 'video';
        }
        return true;
      });

      console.log('🎯 useFiles HOOK: After type filter:', {
        type: options.type,
        beforeCount: beforeTypeFilter,
        afterCount: filtered.length,
        filtered: filtered.map(f => ({ id: f.id, title: f.title, type: f.type }))
      });
    }

    // Sort by date added (newest first)
    const sorted = filtered.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());

    console.log('✅ useFiles HOOK: Final result:', {
      finalCount: sorted.length,
      finalFiles: sorted.map(f => ({ id: f.id, title: f.title, url: f.url, type: f.type }))
    });

    return sorted;
  }, [allFiles, options.reference, options.type]);

  // Upload file function
  const uploadFile = async (
    file: any,
    uploadOptions: { reference?: string; title?: string; alt?: string } = {}
  ) => {
    if (!currentStore) {
      return { success: false, error: 'No store selected' };
    }

    if (!user) {
      return { success: false, error: 'User must be authenticated to upload files' };
    }

    const fileUploadOptions = {
      storeId: currentStore.id,
      userId: user.id,
      category: 'general',
      reference: uploadOptions.reference || options.reference || '',
      title: uploadOptions.title || file.name || `file_${Date.now()}`,
      alt: uploadOptions.alt || ''
    };

    return await fileManager.uploadFile(file, fileUploadOptions);
  };

  // Replace file function
  const replaceFile = async (
    existingFileId: string,
    newFile: any,
    replaceOptions: { reference?: string; title?: string; alt?: string } = {}
  ) => {
    if (!currentStore) {
      return { success: false, error: 'No store selected' };
    }

    if (!user) {
      return { success: false, error: 'User must be authenticated to replace files' };
    }

    const fileReplaceOptions = {
      storeId: currentStore.id,
      userId: user.id,
      category: 'general',
      reference: replaceOptions.reference || options.reference || '',
      title: replaceOptions.title || newFile.name || `file_${Date.now()}`,
      alt: replaceOptions.alt || '',
      existingFileId
    };

    return await fileManager.replaceFile(newFile, fileReplaceOptions);
  };

  // Update file metadata
  const updateFileMetadata = async (
    fileId: string, 
    updates: Partial<Pick<FileRecord, 'title' | 'alt' | 'reference'>>
  ) => {
    return await fileManager.updateFileMetadata(fileId, updates);
  };

  // Get files by reference (from current files list)
  const getFilesByReference = (reference: string): FileRecord[] => {
    return allFiles.filter(file => file.reference === reference);
  };

  // Check if file is referenced (basic check within current files)
  const isFileReferenced = (fileId: string): boolean => {
    const file = allFiles.find(f => f.id === fileId);
    return file ? Boolean(file.reference) : false;
  };

  return {
    files,
    isLoading,
    error,
    uploadFile,
    replaceFile,
    updateFileMetadata,
    getFilesByReference,
    isFileReferenced
  };
}

// Hook specifically for file selection/management
export function useFileSelection() {
  const { currentStore } = useStore();
  const { user } = db.useAuth();

  const query = currentStore?.id ? {
    files: {
      $: { where: { storeId: currentStore.id } }
    }
  } : {};

  console.log('🔍 useFileSelection HOOK: Database query:', {
    currentStoreId: currentStore?.id,
    query,
    hasCurrentStore: !!currentStore
  });

  const { data: filesData, isLoading, error } = db.useQuery(query);

  const files = filesData?.files || [];

  // Add comprehensive logging for file selection
  useEffect(() => {
    console.log('🗂️ useFileSelection HOOK: Query result:', {
      currentStoreId: currentStore?.id,
      filesData,
      filesCount: files.length,
      files: files.map(f => ({
        id: f.id,
        title: f.title,
        url: f.url,
        type: f.type,
        size: f.size,
        storeId: f.storeId,
        reference: f.reference
      })),
      isLoading,
      error
    });

    // Log specific details about image files
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length > 0) {
      console.log('🖼️ useFileSelection HOOK: Image files found:', {
        imageCount: imageFiles.length,
        imageFiles: imageFiles.map(f => ({
          id: f.id,
          title: f.title,
          url: f.url,
          type: f.type
        }))
      });
    } else {
      console.log('❌ useFileSelection HOOK: No image files found');
    }
  }, [files.length, currentStore?.id, isLoading, error]);

  const getFilesByType = (type: 'images' | 'videos' | 'documents' | 'all') => {
    if (type === 'all') return files;

    return files.filter(file => {
      if (type === 'images') {
        return file.type.startsWith('image/') || file.type === 'image';
      }
      if (type === 'videos') {
        return file.type.startsWith('video/') || file.type === 'video';
      }
      if (type === 'documents') {
        return !file.type.startsWith('image/') &&
               !file.type.startsWith('video/') &&
               file.type !== 'image' &&
               file.type !== 'video';
      }
      return true;
    });
  };

  const searchFiles = (query: string, type: 'images' | 'videos' | 'documents' | 'all' = 'all') => {
    const filteredFiles = getFilesByType(type);

    console.log('🔍 useFileSelection HOOK: searchFiles called:', {
      query,
      type,
      totalFiles: files.length,
      filteredByType: filteredFiles.length,
      filteredFiles: filteredFiles.map(f => ({ id: f.id, title: f.title, type: f.type }))
    });

    if (!query.trim()) return filteredFiles;

    const searchQuery = query.toLowerCase();
    const searchResult = filteredFiles.filter(file =>
      file.title.toLowerCase().includes(searchQuery) ||
      file.alt?.toLowerCase().includes(searchQuery) ||
      file.reference?.toLowerCase().includes(searchQuery)
    );

    console.log('🔍 useFileSelection HOOK: searchFiles result:', {
      query,
      searchResultCount: searchResult.length,
      searchResult: searchResult.map(f => ({ id: f.id, title: f.title }))
    });

    return searchResult;
  };

  const getFileById = (fileId: string) => {
    return files.find(file => file.id === fileId);
  };

  const getFileByHandle = (handle: string) => {
    return files.find(file => file.handle === handle);
  };

  return {
    files,
    isLoading,
    error,
    getFilesByType,
    searchFiles,
    getFileById,
    getFileByHandle
  };
}

export default useFiles;
