import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, BackHandler, StatusBar, Modal } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../lib/store-context';
import { useAuth } from '../lib/auth-context';
import { r2Service } from '../lib/r2-service';
import StoreForm from './store-form';
import StoreManagement from './store-mgmt';
import ComList from './comlist';
import PeopleaScreen from '../screens/peoplea';

type Screen = 'space' | 'sales' | 'reports' | 'products' | 'collections' | 'options' | 'metafields' | 'menu' | 'items' | 'locations';

interface FullScreenMenuProps {
  onNavigate: (screen: Screen) => void;
  onClose: () => void;
}

export default function FullScreenMenu({ onNavigate, onClose }: FullScreenMenuProps) {
  const insets = useSafeAreaInsets();
  const { currentStore } = useStore();
  const { user, peopleaProfile } = useAuth();
  const [showStoreForm, setShowStoreForm] = useState(false);
  const [showStoreManagement, setShowStoreManagement] = useState(false);
  const [showComList, setShowComList] = useState(false);
  const [showPeopleaScreen, setShowPeopleaScreen] = useState(false);
  const [showStatusDrawer, setShowStatusDrawer] = useState(false);
  const [displayImageUrl, setDisplayImageUrl] = useState<string>('');
  const [currentStatus, setCurrentStatus] = useState('Work');

  // User status and notification data
  const userData = {
    status: 'Work',
    spaceNotifications: [
      { type: 'taxi', message: 'Taxi arriving in 10 minutes', time: '10 mins' },
      { type: 'cab', message: 'Cab booked for 3:30 PM', time: '15 mins' }
    ],
    commerceStats: {
      products: 156,
      inventory: '89%',
      reports: 'Updated'
    }
  };

  // Set image URL immediately when profile is available
  useEffect(() => {
    if (peopleaProfile?.profileImage) {
      // If it's an R2 URL, generate signed URL
      if (peopleaProfile.profileImage.includes('r2.cloudflarestorage.com')) {
        const generateSignedUrl = async () => {
          try {
            const key = r2Service.extractKeyFromUrl(peopleaProfile.profileImage);
            if (key) {
              const signedUrl = await r2Service.getSignedUrl(key, 3600);
              if (signedUrl) {
                setDisplayImageUrl(signedUrl);
                // Prefetch the image to cache it
                Image.prefetch(signedUrl);
              } else {
                setDisplayImageUrl(peopleaProfile.profileImage);
              }
            } else {
              setDisplayImageUrl(peopleaProfile.profileImage);
            }
          } catch (error) {
            // Keep using original URL on error
            setDisplayImageUrl(peopleaProfile.profileImage);
          }
        };
        generateSignedUrl();
      } else {
        // For non-R2 URLs, use directly
        setDisplayImageUrl(peopleaProfile.profileImage);
        // Prefetch non-R2 images too
        Image.prefetch(peopleaProfile.profileImage);
      }
    } else {
      setDisplayImageUrl('');
    }
  }, [peopleaProfile?.profileImage]);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      // If any sub-screen is open, close it
      if (showStoreForm) {
        setShowStoreForm(false);
        return true;
      }
      if (showStoreManagement) {
        setShowStoreManagement(false);
        return true;
      }
      if (showComList) {
        setShowComList(false);
        return true;
      }
      if (showPeopleaScreen) {
        setShowPeopleaScreen(false);
        return true;
      }
      // If main menu is open, close it
      onClose();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => {
      backHandler.remove();
    };
  }, [showStoreForm, showStoreManagement, showComList, showPeopleaScreen, onClose]);



  const handleItemPress = (itemId: string) => {
    // Handle special cases
    if (itemId === 'space') {
      onNavigate('space' as Screen);
    } else if (itemId === 'commerce') {
      onNavigate('sales' as Screen);
    } else if (itemId === 'comlist') {
      setShowComList(true);
    } else if (itemId === 'store') {
      setShowStoreManagement(true);
    } else {
      onNavigate(itemId as Screen);
    }
  };

  // Show store management screens
  if (showStoreForm) {
    return (
      <StoreForm
        onClose={() => setShowStoreForm(false)}
        onSave={() => setShowStoreForm(false)}
      />
    );
  }

  if (showStoreManagement) {
    return (
      <StoreManagement
        onClose={() => setShowStoreManagement(false)}
      />
    );
  }

  if (showComList) {
    return (
      <ComList
        onNavigate={onNavigate}
        onClose={() => setShowComList(false)}
      />
    );
  }

  if (showPeopleaScreen) {
    return (
      <PeopleaScreen
        onClose={() => setShowPeopleaScreen(false)}
      />
    );
  }

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6" style={{ paddingTop: insets.top + 20 }}>
          {/* User Status Header */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => setShowPeopleaScreen(true)}
                className="w-12 h-12 rounded-full overflow-hidden"
              >
                <Image
                  source={
                    displayImageUrl && displayImageUrl.length > 0 && displayImageUrl !== ''
                      ? { uri: displayImageUrl }
                      : require('../../assets/adaptive-icon.png')
                  }
                  style={{ width: 48, height: 48 }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setShowStatusDrawer(true)}
                className="px-3 py-1 border border-gray-300"
                style={{ borderRadius: 6 }}
              >
                <Text className="text-gray-800 text-sm">
                  {currentStatus.toLowerCase()}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Space Card - White */}
          <TouchableOpacity
            onPress={() => handleItemPress('space')}
            className="bg-white p-6 mb-1"
            style={{ minHeight: 160 }}
          >
            <View className="flex-1">
              <Text className="text-black text-2xl font-bold mb-2">Space</Text>
              <Text className="text-gray-500 text-xl font-bold">
                {userData.spaceNotifications.length > 0
                  ? userData.spaceNotifications[0].message
                  : 'Taxi arriving in 10 minutes'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Commerce Card - Light White */}
          <TouchableOpacity
            onPress={() => handleItemPress('commerce')}
            className="p-6"
            style={{ minHeight: 280, borderRadius: 10, backgroundColor: '#F5F5F5' }}
          >
            <View className="flex-1">
              {/* Header */}
              <View className="mb-4">
                <Text className="text-black text-2xl font-bold mb-3">Commerce</Text>
                <TouchableOpacity 
                  onPress={() => setShowStoreManagement(true)}
                  className="self-start px-3 py-1 border border-gray-300"
                  style={{ borderRadius: 6 }}
                >
                  <Text className="text-green-800 text-sm">
                    {currentStore?.name || 'Store A'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Bottom row with circles and arrow */}
              <View className="flex-row items-center justify-between mt-auto">
                <View className="flex-row">
                  <TouchableOpacity
                    onPress={() => handleItemPress('products')}
                    className="w-12 h-12 bg-yellow-400 items-center justify-center mr-3"
                    style={{ borderRadius: 24 }}
                  >
                    <Text className="text-black text-xl font-bold">P</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleItemPress('items')}
                    className="w-12 h-12 bg-purple-400 items-center justify-center mr-3"
                    style={{ borderRadius: 24 }}
                  >
                    <Text className="text-black text-xl font-bold">I</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleItemPress('reports')}
                    className="w-12 h-12 bg-blue-400 items-center justify-center"
                    style={{ borderRadius: 24 }}
                  >
                    <Text className="text-black text-xl font-bold">R</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={() => handleItemPress('comlist')}
                  className="w-12 h-12 bg-black items-center justify-center"
                  style={{ borderRadius: 24 }}
                >
                  <Text className="text-white text-xl font-bold">→</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>


        </View>
      </ScrollView>

      {/* Status Selection Bottom Drawer */}
      <Modal
        visible={showStatusDrawer}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStatusDrawer(false)}
      >
        <View className="flex-1 justify-end">
          <View className="bg-white rounded-t-3xl" style={{ paddingBottom: insets.bottom }}>
            {/* Handle bar */}
            <View className="items-center py-3">
              <View className="w-10 h-1 bg-gray-300 rounded-full" />
            </View>
            
            {/* Header */}
            <View className="px-6 pb-4">
              <Text className="text-lg font-semibold text-gray-900">Status</Text>
            </View>
            
            {/* Status Options */}
            <View className="px-6 pb-6">
              {['Work', 'Offline', 'Break', 'Available'].map((status) => (
                <TouchableOpacity
                  key={status}
                  onPress={() => {
                    setCurrentStatus(status);
                    setShowStatusDrawer(false);
                  }}
                  className={`py-4 border-b border-gray-100 ${status === 'Offline' ? 'last:border-b-0' : ''}`}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className={`text-base ${currentStatus === status ? 'text-blue-600 font-medium' : 'text-gray-900'}`}>
                      {status}
                    </Text>
                    {currentStatus === status && (
                      <View className="w-5 h-5 bg-blue-600 rounded-full items-center justify-center">
                        <Text className="text-white text-xs">✓</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}
