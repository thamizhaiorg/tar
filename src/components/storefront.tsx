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
        {/* Hero Section */}
        <View className="bg-white px-6 pt-8 pb-6 border-b border-gray-200">
          <Text className="text-3xl font-bold text-gray-900 mb-2">
            Storefront Site
          </Text>
          <Text className="text-lg text-gray-600">
            Manage your online storefront and web presence
          </Text>
        </View>

        {/* Quick Stats Cards */}
        <View className="px-6 pt-8">
          <View className="flex-row gap-4 mb-8">
            <View className="flex-1 bg-white p-4 rounded-xl border border-gray-200">
              <Text className="text-2xl font-bold text-gray-900">0</Text>
              <Text className="text-sm text-gray-600">Online Orders</Text>
            </View>
            <View className="flex-1 bg-white p-4 rounded-xl border border-gray-200">
              <Text className="text-2xl font-bold text-gray-900">0</Text>
              <Text className="text-sm text-gray-600">Site Visitors</Text>
            </View>
          </View>

          {/* Main Features */}
          <View className="gap-4">
            {/* Site Management */}
            <TouchableOpacity className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <View className="flex-row items-center">
                <View className="w-12 h-12 bg-blue-100 rounded-xl items-center justify-center mr-4">
                  <Text className="text-xl">🌐</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-semibold text-gray-900 mb-1">
                    Site Settings
                  </Text>
                  <Text className="text-gray-600">
                    Configure your storefront appearance and settings
                  </Text>
                </View>
                <Text className="text-gray-400 text-xl">›</Text>
              </View>
            </TouchableOpacity>

            {/* Theme Customization */}
            <TouchableOpacity className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <View className="flex-row items-center">
                <View className="w-12 h-12 bg-purple-100 rounded-xl items-center justify-center mr-4">
                  <Text className="text-xl">🎨</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-semibold text-gray-900 mb-1">
                    Theme & Design
                  </Text>
                  <Text className="text-gray-600">
                    Customize colors, fonts, and layout
                  </Text>
                </View>
                <Text className="text-gray-400 text-xl">›</Text>
              </View>
            </TouchableOpacity>

            {/* Online Orders */}
            <TouchableOpacity className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <View className="flex-row items-center">
                <View className="w-12 h-12 bg-green-100 rounded-xl items-center justify-center mr-4">
                  <Text className="text-xl">📦</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-semibold text-gray-900 mb-1">
                    Online Orders
                  </Text>
                  <Text className="text-gray-600">
                    Manage orders from your website
                  </Text>
                </View>
                <Text className="text-gray-400 text-xl">›</Text>
              </View>
            </TouchableOpacity>

            {/* SEO & Marketing */}
            <TouchableOpacity className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <View className="flex-row items-center">
                <View className="w-12 h-12 bg-orange-100 rounded-xl items-center justify-center mr-4">
                  <Text className="text-xl">📈</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-semibold text-gray-900 mb-1">
                    SEO & Marketing
                  </Text>
                  <Text className="text-gray-600">
                    Optimize for search engines and social media
                  </Text>
                </View>
                <Text className="text-gray-400 text-xl">›</Text>
              </View>
            </TouchableOpacity>

            {/* Analytics */}
            <TouchableOpacity className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <View className="flex-row items-center">
                <View className="w-12 h-12 bg-red-100 rounded-xl items-center justify-center mr-4">
                  <Text className="text-xl">📊</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-semibold text-gray-900 mb-1">
                    Analytics
                  </Text>
                  <Text className="text-gray-600">
                    Track website performance and customer behavior
                  </Text>
                </View>
                <Text className="text-gray-400 text-xl">›</Text>
              </View>
            </TouchableOpacity>

            {/* Domain & Hosting */}
            <TouchableOpacity className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <View className="flex-row items-center">
                <View className="w-12 h-12 bg-indigo-100 rounded-xl items-center justify-center mr-4">
                  <Text className="text-xl">🔗</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-semibold text-gray-900 mb-1">
                    Domain & Hosting
                  </Text>
                  <Text className="text-gray-600">
                    Manage your domain and hosting settings
                  </Text>
                </View>
                <Text className="text-gray-400 text-xl">›</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Bottom Section */}
          <View className="mt-8 mb-8">
            <View className="bg-white p-4 rounded-xl border border-gray-200">
              <Text className="text-sm text-gray-600 text-center">
                Powered by TAR POS • Real-time storefront sync
              </Text>
            </View>
          </View>
        </View>
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