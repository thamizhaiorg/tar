import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuth } from '../lib/auth-context';
import { r2Service } from '../lib/r2-service';
import BottomNavigation, { BottomTab } from './nav';
import BottomTabContent from './tabs';

type StorefrontScreen = 'work' | 'ai' | 'tasks' | 'people';

interface StorefrontProps {
  onClose: () => void;
}

export default function StorefrontScreen({ onClose }: StorefrontProps) {
  const insets = useSafeAreaInsets();
  const { peopleaProfile } = useAuth();
  const [activeBottomTab, setActiveBottomTab] = useState<BottomTab>('workspace');
  const [showBottomTabs, setShowBottomTabs] = useState(true);
  const [displayImageUrl, setDisplayImageUrl] = useState<string>('');

  // Set image URL when profile is available
  React.useEffect(() => {
    if (peopleaProfile?.profileImage) {
      if (peopleaProfile.profileImage.includes('r2.cloudflarestorage.com')) {
        const generateSignedUrl = async () => {
          try {
            const key = r2Service.extractKeyFromUrl(peopleaProfile.profileImage);
            if (key) {
              const signedUrl = await r2Service.getSignedUrl(key, 3600);
              if (signedUrl) {
                setDisplayImageUrl(signedUrl);
                Image.prefetch(signedUrl);
              } else {
                setDisplayImageUrl(peopleaProfile.profileImage);
              }
            } else {
              setDisplayImageUrl(peopleaProfile.profileImage);
            }
          } catch (error) {
            setDisplayImageUrl(peopleaProfile.profileImage);
          }
        };
        generateSignedUrl();
      } else {
        setDisplayImageUrl(peopleaProfile.profileImage);
        Image.prefetch(peopleaProfile.profileImage);
      }
    } else {
      setDisplayImageUrl('');
    }
  }, [peopleaProfile?.profileImage]);

  const handleBottomTabPress = useCallback((tab: BottomTab) => {
    setActiveBottomTab(tab);
    if (tab === 'workspace') {
      setShowBottomTabs(true);
    } else {
      setShowBottomTabs(false);
    }
  }, []);

  const renderMainContent = () => {
    if (!showBottomTabs) {
      return (
        <BottomTabContent
          activeTab={activeBottomTab}
          currentScreen="storefront"
        />
      );
    }

    return (
      <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View className="bg-white px-4 pt-6 pb-4">
          <Text className="text-2xl font-bold text-gray-900 mb-1">
            Storefront Site
          </Text>
          <Text className="text-gray-600">
            Manage your online storefront and web presence
          </Text>
        </View>

        {/* Stats Section */}
        <View className="px-4 pt-4">
          <View className="flex-row gap-3 mb-6">
            <View className="flex-1 bg-white p-4 rounded-lg">
              <Text className="text-2xl font-bold text-gray-900">0</Text>
              <Text className="text-sm text-gray-600 mt-1">Online Orders</Text>
            </View>
            <View className="flex-1 bg-white p-4 rounded-lg">
              <Text className="text-2xl font-bold text-gray-900">0</Text>
              <Text className="text-sm text-gray-600 mt-1">Site Visitors</Text>
            </View>
          </View>

          {/* Main Actions */}
          <View className="gap-3">
            {/* Site Settings */}
            <TouchableOpacity className="bg-white p-4 rounded-lg flex-row items-center">
              <View className="w-10 h-10 bg-blue-50 rounded-lg items-center justify-center mr-3">
                <Feather name="globe" size={20} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  Site Settings
                </Text>
                <Text className="text-sm text-gray-600 mt-0.5">
                  Configure your storefront appearance and settings
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Theme & Design */}
            <TouchableOpacity className="bg-white p-4 rounded-lg flex-row items-center">
              <View className="w-10 h-10 bg-purple-50 rounded-lg items-center justify-center mr-3">
                <Feather name="edit-3" size={20} color="#8B5CF6" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  Theme & Design
                </Text>
                <Text className="text-sm text-gray-600 mt-0.5">
                  Customize colors, fonts, and layout
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Online Orders */}
            <TouchableOpacity className="bg-white p-4 rounded-lg flex-row items-center">
              <View className="w-10 h-10 bg-green-50 rounded-lg items-center justify-center mr-3">
                <Feather name="package" size={20} color="#10B981" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  Online Orders
                </Text>
                <Text className="text-sm text-gray-600 mt-0.5">
                  Manage orders from your website
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* SEO & Marketing */}
            <TouchableOpacity className="bg-white p-4 rounded-lg flex-row items-center">
              <View className="w-10 h-10 bg-orange-50 rounded-lg items-center justify-center mr-3">
                <Feather name="trending-up" size={20} color="#F59E0B" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  SEO & Marketing
                </Text>
                <Text className="text-sm text-gray-600 mt-0.5">
                  Optimize for search engines and social media
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View className="h-8" />
      </ScrollView>
    );
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View style={{ paddingTop: insets.top }}>
        <View className="px-4 h-16 flex items-center flex-row justify-between bg-white border-b border-gray-200">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={onClose}
              className="flex-row items-center"
            >
              <Text className="text-xl mr-2">🌐</Text>
              <Text className="text-xl font-semibold text-gray-900">Storefront</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            onPress={onClose}
            className="w-8 h-8 rounded-full overflow-hidden"
          >
            <Image
              source={
                displayImageUrl && displayImageUrl.length > 0 && displayImageUrl !== ''
                  ? { uri: displayImageUrl }
                  : require('../../assets/adaptive-icon.png')
              }
              style={{ width: 32, height: 32 }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      {renderMainContent()}

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab={activeBottomTab}
        onTabPress={handleBottomTabPress}
        currentScreen="storefront"
      />
    </View>
  );
}