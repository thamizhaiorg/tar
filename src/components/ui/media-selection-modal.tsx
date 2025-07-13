import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { db } from '../../lib/instant';
import { useStore } from '../../lib/store-context';
import { useFiles } from '../../hooks/useFiles';
import { fileManager } from '../../lib/file-manager';
import R2Image from './r2-image';

interface MediaItem {
  id: string;
  title: string;
  url: string;
  handle: string;
  alt?: string;
  type: string;
  size: number;
  reference?: string;
  dateAdded: Date;
  storeId: string;
  userId?: string;
}

interface MediaSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (media: MediaItem[]) => void;
  allowMultiple?: boolean;
  title?: string;
  selectedMedia?: MediaItem[];
}

export default function MediaSelectionModal({
  visible,
  onClose,
  onSelect,
  allowMultiple = false,
  title = 'Select Images',
  selectedMedia = []
}: MediaSelectionModalProps) {
  const insets = useSafeAreaInsets();
  const { currentStore } = useStore();
  const { user } = db.useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);

  // Use the files hook to get images only
  const { files, uploadFile } = useFiles({ type: 'images' });

  // Initialize selected media
  useEffect(() => {
    if (selectedMedia.length > 0) {
      setSelectedMediaIds(new Set(selectedMedia.map(m => m.id)));
    }
  }, [selectedMedia]);

  // Filter images based on search query
  const filteredImages = useMemo(() => {
    if (!searchQuery.trim()) return files;
    
    const searchQuery_lower = searchQuery.toLowerCase();
    return files.filter(file => 
      file.title.toLowerCase().includes(searchQuery_lower) ||
      file.alt?.toLowerCase().includes(searchQuery_lower)
    );
  }, [files, searchQuery]);

  const handleMediaToggle = (media: MediaItem) => {
    const newSelected = new Set(selectedMediaIds);
    
    if (allowMultiple) {
      if (newSelected.has(media.id)) {
        newSelected.delete(media.id);
      } else {
        newSelected.add(media.id);
      }
    } else {
      // Single selection - clear others and add this one
      newSelected.clear();
      newSelected.add(media.id);
    }
    
    setSelectedMediaIds(newSelected);
  };

  const handleConfirmSelection = () => {
    const selectedMediaArray = filteredImages.filter(media => selectedMediaIds.has(media.id));
    onSelect(selectedMediaArray);
    onClose();
  };

  const handleUpload = async () => {
    if (!currentStore || !user) {
      Alert.alert('Error', 'Please ensure you are logged in and have a store selected');
      return;
    }

    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant media library permissions to upload images.');
        return;
      }

      setUploading(true);

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: allowMultiple,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets) {
        const uploadPromises = result.assets.map(async (asset) => {
          const file = {
            uri: asset.uri,
            name: asset.fileName || `image_${Date.now()}.jpg`,
            type: asset.type || 'image/jpeg',
            size: asset.fileSize || 0
          };

          return await uploadFile(file, {
            title: file.name,
            alt: ''
          });
        });

        const results = await Promise.all(uploadPromises);
        
        // Check for any failures
        const failures = results.filter(r => !r.success);
        if (failures.length > 0) {
          Alert.alert('Upload Error', `${failures.length} file(s) failed to upload`);
        } else {
          Alert.alert('Success', `${results.length} image(s) uploaded successfully`);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Error', 'Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderMediaItem = ({ item: media }: { item: MediaItem }) => {
    const isSelected = selectedMediaIds.has(media.id);
    
    return (
      <TouchableOpacity
        onPress={() => handleMediaToggle(media)}
        className="relative"
        style={{ width: '48%', marginBottom: 12 }}
      >
        <View className={`bg-white rounded-lg overflow-hidden border-2 ${
          isSelected ? 'border-blue-500' : 'border-gray-200'
        }`}>
          <View style={{ height: 120, backgroundColor: '#F8F9FA' }}>
            <R2Image
              url={media.url}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
          <View className="p-2">
            <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
              {media.title}
            </Text>
            <Text className="text-xs text-gray-500">
              {formatFileSize(media.size)}
            </Text>
          </View>
        </View>
        
        {/* Selection Checkbox */}
        <View className="absolute top-2 right-2">
          <View className={`w-6 h-6 rounded border-2 items-center justify-center ${
            isSelected 
              ? 'bg-blue-500 border-blue-500' 
              : 'bg-white border-gray-300'
          }`}>
            {isSelected && (
              <MaterialIcons name="check" size={16} color="white" />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
        {/* Header */}
        <View className="bg-white border-b border-gray-200 px-4 py-3">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-900">{title}</Text>
            <TouchableOpacity 
              onPress={handleUpload}
              disabled={uploading}
              className={`px-3 py-1 rounded-lg ${uploading ? 'bg-gray-300' : 'bg-blue-600'}`}
            >
              <Text className={`text-sm font-medium ${uploading ? 'text-gray-500' : 'text-white'}`}>
                {uploading ? 'Uploading...' : 'Upload'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View className="bg-white border-b border-gray-200 px-4 py-3">
          <View className="bg-gray-100 rounded-lg px-3 py-2 flex-row items-center">
            <MaterialIcons name="search" size={20} color="#6B7280" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Filter by title"
              className="flex-1 ml-2 text-base"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* Images Grid */}
        <View className="flex-1">
          {filteredImages.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <MaterialIcons name="photo-library" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 mt-2">No images found</Text>
              {searchQuery && (
                <Text className="text-sm text-gray-400 mt-1">Try adjusting your search</Text>
              )}
              <TouchableOpacity 
                onPress={handleUpload}
                className="mt-4 bg-blue-600 px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-medium">Upload Images</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredImages}
              renderItem={renderMediaItem}
              keyExtractor={(item) => item.id}
              numColumns={2}
              contentContainerStyle={{
                padding: 16,
                gap: 12
              }}
              columnWrapperStyle={{ justifyContent: 'space-between' }}
            />
          )}
        </View>

        {/* Bottom Action Bar */}
        {selectedMediaIds.size > 0 && (
          <View className="bg-white border-t border-gray-200 px-4 py-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-700 font-medium">
                {selectedMediaIds.size} selected
              </Text>
              <TouchableOpacity
                onPress={handleConfirmSelection}
                className="bg-blue-600 px-6 py-2 rounded-lg"
              >
                <Text className="text-white font-medium">
                  {allowMultiple ? 'Select Images' : 'Select Image'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
