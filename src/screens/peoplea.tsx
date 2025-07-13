import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert, Image, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../lib/auth-context';

interface PeopleaScreenProps {
  onClose: () => void;
}

export default function PeopleaScreen({ onClose }: PeopleaScreenProps) {
  const insets = useSafeAreaInsets();
  const { user, peopleaProfile, createPeopleaProfile, updatePeopleaProfile, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bio: '',
    profileImage: '',
  });

  // Initialize form data when profile loads
  useEffect(() => {
    if (peopleaProfile) {
      setFormData({
        name: peopleaProfile.name || '',
        phone: peopleaProfile.phone || '',
        bio: peopleaProfile.bio || '',
        profileImage: peopleaProfile.profileImage || '',
      });
    } else if (user) {
      // If no profile exists, set default values
      setFormData({
        name: user.email?.split('@')[0] || '',
        phone: '',
        bio: '',
        profileImage: '',
      });
      setIsEditing(true); // Start in editing mode for new profiles
    }
  }, [peopleaProfile, user]);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      if (isEditing) {
        handleCancelEdit();
      } else {
        onClose();
      }
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isEditing, onClose]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (peopleaProfile) {
        await updatePeopleaProfile(formData);
      } else {
        await createPeopleaProfile(formData);
      }
      setIsEditing(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (peopleaProfile) {
      // Reset to original values
      setFormData({
        name: peopleaProfile.name || '',
        phone: peopleaProfile.phone || '',
        bio: peopleaProfile.bio || '',
        profileImage: peopleaProfile.profileImage || '',
      });
      setIsEditing(false);
    } else {
      // If no profile exists and user cancels, close the screen
      onClose();
    }
  };

  const handleImagePicker = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to change your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setFormData(prev => ({
        ...prev,
        profileImage: result.assets[0].uri,
      }));
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-6 py-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={isEditing ? handleCancelEdit : onClose}>
            <Text className="text-lg text-gray-600">
              {isEditing ? 'Cancel' : 'Close'}
            </Text>
          </TouchableOpacity>
          <Text className="text-xl font-semibold text-gray-900">Profile</Text>
          {isEditing ? (
            <TouchableOpacity onPress={handleSave} disabled={isSaving}>
              <Text className={`text-lg ${isSaving ? 'text-gray-400' : 'text-blue-600'}`}>
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Text className="text-lg text-blue-600">Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-6">
        {/* Profile Image */}
        <View className="items-center mb-8">
          <TouchableOpacity
            onPress={isEditing ? handleImagePicker : undefined}
            className="relative"
          >
            <View className="w-24 h-24 bg-gray-200 rounded-full items-center justify-center overflow-hidden">
              {formData.profileImage ? (
                <Image
                  source={{ uri: formData.profileImage }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Text className="text-3xl text-gray-500">
                  {formData.name ? formData.name.charAt(0).toUpperCase() : '👤'}
                </Text>
              )}
            </View>
            {isEditing && (
              <View className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 rounded-full items-center justify-center">
                <Text className="text-white text-sm">✏️</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View className="space-y-6">
          {/* Email (Read-only) */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">Email</Text>
            <View className="px-4 py-3 bg-gray-50 rounded-lg">
              <Text className="text-gray-600">{user?.email}</Text>
            </View>
          </View>

          {/* Name */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">Name</Text>
            <TextInput
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              placeholder="Enter your name"
              editable={isEditing}
              className={`px-4 py-3 rounded-lg ${
                isEditing ? 'bg-white border border-gray-300' : 'bg-gray-50'
              }`}
            />
          </View>

          {/* Phone */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">Phone</Text>
            <TextInput
              value={formData.phone}
              onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
              editable={isEditing}
              className={`px-4 py-3 rounded-lg ${
                isEditing ? 'bg-white border border-gray-300' : 'bg-gray-50'
              }`}
            />
          </View>

          {/* Bio */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">Bio</Text>
            <TextInput
              value={formData.bio}
              onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
              placeholder="Tell us about yourself"
              multiline
              numberOfLines={3}
              editable={isEditing}
              className={`px-4 py-3 rounded-lg ${
                isEditing ? 'bg-white border border-gray-300' : 'bg-gray-50'
              }`}
              style={{ textAlignVertical: 'top' }}
            />
          </View>
        </View>

        {/* Sign Out Button */}
        <View className="mt-12 pt-6 border-t border-gray-200">
          <TouchableOpacity
            onPress={handleSignOut}
            className="w-full py-4 bg-red-50 rounded-lg"
          >
            <Text className="text-red-600 text-center text-lg font-medium">
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
