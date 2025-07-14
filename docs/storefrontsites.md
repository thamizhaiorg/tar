# React Native Expo Web App Storefront - Customer E-commerce Sites

## Overview
This document provides comprehensive instructions for building a separate React Native Expo web app called "storefront" that serves as customer-facing e-commerce websites. This is NOT an admin interface - it's the actual storefront websites that customers visit to browse and purchase products.

**Key Points:**
- This is a separate app from the main TAR POS admin app
- It serves customer-facing e-commerce websites
- Each store gets their own website (e.g., `yourplatform.com/store/store123` or `store123.com`)
- Customers browse products, add to cart, and checkout
- Uses the same InstantDB and Cloudflare R2 backend as the main app

## Architecture Overview

### Multi-Tenant Structure
- **Single Deployment**: All storefronts served from one Expo web app
- **Dynamic Routing**: Routes like `/store/[storeId]` or custom domains
- **Real-time Data**: InstantDB for live content updates
- **Global CDN**: Cloudflare Pages for worldwide delivery
- **Custom Domains**: Users can map their own domains to their storefront

### Tech Stack
- **Frontend**: React Native with Expo Web
- **Database**: InstantDB (real-time sync)
- **Storage**: Cloudflare R2 for media files
- **Hosting**: Cloudflare Pages
- **Authentication**: Magic codes (email-based)
- **AI Integration**: Vercel AI SDK with Gemini

## Project Setup

### 1. Initialize Expo Project
```bash
npx create-expo-app@latest storefront --template blank-typescript
cd storefront
```

### 2. Install Dependencies
```bash
# Core dependencies
npm install @instantdb/react-native
npm install @expo/vector-icons
npm install expo-router
npm install expo-linking
npm install expo-constants
npm install expo-image-picker

# AWS S3 for R2 integration (same as main app)
npm install @aws-sdk/client-s3
npm install @aws-sdk/lib-storage

# UI and styling
npm install react-native-web
npm install @expo/html-elements
npm install react-native-svg
npm install nativewind
npm install tailwindcss

# AI integration (optional for storefront features)
npm install ai @ai-sdk/google

# Additional utilities
npm install react-hook-form
npm install date-fns
npm install uuid
npm install @react-native-async-storage/async-storage
```

### 3. Configure Expo for Web
Create `app.json` (based on current app configuration):
```json
{
  "expo": {
    "name": "Storefront",
    "slug": "storefront",
    "version": "1.0.0",
    "scheme": "storefront",
    "userInterfaceStyle": "automatic",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "platforms": ["web"],
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      [
        "expo-router",
        {
          "origin": false,
          "root": "./src/app"
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "The app accesses your photos for profile pictures.",
          "cameraPermission": "The app accesses your camera for profile pictures."
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    },
    "extra": {
      "router": {
        "origin": false,
        "root": "./src/app"
      }
    }
  }
}
```

### 4. Environment Configuration
Create environment files using the same structure as the main app:

#### `.env` (Development)
```env
# Instant DB (same as main app)
EXPO_PUBLIC_INSTANT_APP_ID=your-instant-app-id

# Cloudflare R2 Configuration (same as main app)
EXPO_PUBLIC_R2_ACCOUNT_ID=your-account-id
EXPO_PUBLIC_R2_ACCESS_KEY_ID=your-access-key
EXPO_PUBLIC_R2_SECRET_ACCESS_KEY=your-secret-key
EXPO_PUBLIC_R2_BUCKET_NAME=your-bucket-name
EXPO_PUBLIC_R2_REGION=auto
EXPO_PUBLIC_R2_ENDPOINT=your-r2-endpoint

# Storefront specific
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_PLATFORM_DOMAIN=yourplatform.com
EXPO_PUBLIC_GEMINI_API_KEY=your-gemini-key
```

#### `.env.production`
```env
# Instant DB (same as main app)
EXPO_PUBLIC_INSTANT_APP_ID=prod-app-id

# Cloudflare R2 Configuration (same as main app)
EXPO_PUBLIC_R2_ACCOUNT_ID=prod-account-id
EXPO_PUBLIC_R2_ACCESS_KEY_ID=prod-access-key
EXPO_PUBLIC_R2_SECRET_ACCESS_KEY=prod-secret-key
EXPO_PUBLIC_R2_BUCKET_NAME=prod-bucket
EXPO_PUBLIC_R2_REGION=auto
EXPO_PUBLIC_R2_ENDPOINT=https://prod.r2.cloudflarestorage.com

# Storefront specific
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_PLATFORM_DOMAIN=yourplatform.com
EXPO_PUBLIC_GEMINI_API_KEY=your-gemini-key
```

## Core Features Implementation

### 1. Dynamic Routing Structure (Customer-Facing)
```
src/
├── app/
│   ├── _layout.tsx                 # Root layout with store detection
│   ├── index.tsx                   # Platform landing page (optional)
│   ├── store/
│   │   └── [storeId]/
│   │       ├── _layout.tsx         # Store-specific layout
│   │       ├── index.tsx           # Store homepage
│   │       ├── products/
│   │       │   ├── index.tsx       # Products catalog
│   │       │   └── [productId].tsx # Product details page
│   │       ├── collections/
│   │       │   ├── index.tsx       # Collections listing
│   │       │   └── [collectionId].tsx # Collection products
│   │       ├── blog/
│   │       │   ├── index.tsx       # Blog posts
│   │       │   └── [postId].tsx    # Individual blog post
│   │       ├── pages/
│   │       │   └── [pageId].tsx    # Custom pages (about, contact, etc.)
│   │       ├── cart.tsx            # Shopping cart
│   │       ├── checkout.tsx        # Checkout process
│   │       └── search.tsx          # Search results
│   └── auth/
│       ├── login.tsx               # Customer login (magic code)
│       └── verify.tsx              # Code verification
├── lib/
│   ├── instant.ts                  # InstantDB configuration (same as main app)
│   ├── r2-config.ts               # R2 configuration (same as main app)
│   ├── r2-service.ts              # R2 service (same as main app)
│   └── file-manager.ts            # File management (same as main app)
├── components/
│   ├── blocks/                     # Page building blocks
│   ├── cart/                       # Cart components
│   ├── product/                    # Product components
│   └── ui/                         # Reusable UI components
└── contexts/
    └── StoreContext.tsx            # Store detection and management
```

### 2. Store Detection & Context
Create `contexts/StoreContext.tsx`:
```typescript
import { createContext, useContext, useEffect, useState } from 'react';
import { useLocalSearchParams, useSegments } from 'expo-router';

interface StoreContextType {
  storeId: string | null;
  storeData: any;
  isLoading: boolean;
}

const StoreContext = createContext<StoreContextType>({
  storeId: null,
  storeData: null,
  isLoading: true,
});

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const segments = useSegments();
  const params = useLocalSearchParams();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeData, setStoreData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Extract store ID from URL or custom domain
    const extractStoreId = () => {
      if (segments[0] === 'store' && params.storeId) {
        return params.storeId as string;
      }

      // Handle custom domain detection
      const hostname = window.location.hostname;
      if (hostname !== 'yourplatform.com') {
        // Look up store by custom domain
        return lookupStoreByDomain(hostname);
      }

      return null;
    };

    const id = extractStoreId();
    setStoreId(id);

    if (id) {
      fetchStoreData(id);
    } else {
      setIsLoading(false);
    }
  }, [segments, params]);

  return (
    <StoreContext.Provider value={{ storeId, storeData, isLoading }}>
      {children}
    </StoreContext.Provider>
  );
}

export const useStore = () => useContext(StoreContext);
```

### 3. InstantDB Integration
Create `src/lib/instant.ts` (same as main app):
```typescript
// Instant DB configuration and initialization
import { init } from '@instantdb/react-native';
import schema from '../../instant.schema';

// Get the app ID from environment variables
const APP_ID = process.env.EXPO_PUBLIC_INSTANT_APP_ID;

if (!APP_ID) {
  throw new Error('EXPO_PUBLIC_INSTANT_APP_ID is not set in environment variables');
}

// Initialize the database with schema for type safety
export const db = init({
  appId: APP_ID,
  schema,
});

// Export types for use throughout the app
export type { AppSchema } from '../../instant.schema';

// Media item interface
export interface MediaItem {
  id: string;
  url: string;
  fileId: string;
  name: string;
  type: string;
}

export default db;
```

### 4. Cloudflare R2 Configuration
Create `src/lib/r2-config.ts` (exact same as main app):
```typescript
import Constants from 'expo-constants';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  region: string;
  endpoint: string;
}

export const r2Config: R2Config = {
  accountId: Constants.expoConfig?.extra?.R2_ACCOUNT_ID || process.env.EXPO_PUBLIC_R2_ACCOUNT_ID || '',
  accessKeyId: Constants.expoConfig?.extra?.R2_ACCESS_KEY_ID || process.env.EXPO_PUBLIC_R2_ACCESS_KEY_ID || '',
  secretAccessKey: Constants.expoConfig?.extra?.R2_SECRET_ACCESS_KEY || process.env.EXPO_PUBLIC_R2_SECRET_ACCESS_KEY || '',
  bucketName: Constants.expoConfig?.extra?.R2_BUCKET_NAME || process.env.EXPO_PUBLIC_R2_BUCKET_NAME || '',
  region: Constants.expoConfig?.extra?.R2_REGION || process.env.EXPO_PUBLIC_R2_REGION || 'auto',
  endpoint: Constants.expoConfig?.extra?.R2_ENDPOINT || process.env.EXPO_PUBLIC_R2_ENDPOINT || '',
};

// Log configuration on load (without sensitive data)
console.log('⚙️ R2Config: Configuration loaded:', {
  accountId: r2Config.accountId ? '***' : 'MISSING',
  accessKeyId: r2Config.accessKeyId ? '***' : 'MISSING',
  secretAccessKey: r2Config.secretAccessKey ? '***' : 'MISSING',
  bucketName: r2Config.bucketName || 'MISSING',
  region: r2Config.region,
  endpoint: r2Config.endpoint || 'MISSING'
});

// Validate configuration
export const validateR2Config = (): boolean => {
  const required = ['accountId', 'accessKeyId', 'secretAccessKey', 'bucketName', 'endpoint'];
  return required.every(key => r2Config[key as keyof R2Config]);
};

// Get public URL for uploaded files
export const getPublicUrl = (key: string): string => {
  const url = `${r2Config.endpoint}/${key}`;
  console.log('🌐 R2Config: Generated public URL:', { key, endpoint: r2Config.endpoint, url });
  return url;
};

// Generate unique file key
export const generateFileKey = (originalName: string | undefined, prefix: string = 'media'): string => {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const safeName = originalName || `file_${timestamp}`;
  const extension = safeName.split('.').pop() || '';
  return `${prefix}/${timestamp}-${randomId}.${extension}`;
};
```

### 5. R2 Service Integration
Create `src/lib/r2-service.ts` (same as main app, but focused on storefront needs):
```typescript
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { r2Config, validateR2Config, getPublicUrl, generateFileKey } from './r2-config';

interface MediaFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

class R2Service {
  private client: S3Client | null = null;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    console.log('🔧 R2Service: Initializing client...');

    if (!validateR2Config()) {
      console.error('❌ R2Service: R2 configuration is incomplete');
      return;
    }

    console.log('✅ R2Service: Configuration validated, creating S3Client');

    this.client = new S3Client({
      region: r2Config.region,
      endpoint: r2Config.endpoint,
      credentials: {
        accessKeyId: r2Config.accessKeyId,
        secretAccessKey: r2Config.secretAccessKey,
      },
      forcePathStyle: true, // Required for R2
    });

    console.log('✅ R2Service: S3Client created successfully');
  }

  async uploadFile(file: MediaFile, prefix: string = 'storefront'): Promise<UploadResult> {
    if (!this.client) {
      console.error('❌ R2Service: R2 client not initialized');
      return { success: false, error: 'R2 client not initialized' };
    }

    console.log(`🔄 R2Service: Starting file upload: ${file.name}`);

    try {
      // Generate unique key for the file
      const key = generateFileKey(file.name, prefix);
      console.log(`📝 R2Service: Generated file key: ${key}`);

      // Read file content
      const response = await fetch(file.uri);
      const arrayBuffer = await response.arrayBuffer();
      const body = new Uint8Array(arrayBuffer);

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
      console.log('✅ R2Service: File uploaded successfully:', {
        key,
        url,
        fileName: file.name,
        fileType: file.type,
        bucketName: r2Config.bucketName
      });

      return { success: true, url, key };

    } catch (error) {
      console.error('❌ R2Service: Upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    if (!this.client) {
      console.error('❌ R2Service: R2 client not initialized');
      return false;
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: r2Config.bucketName,
        Key: key,
      });

      await this.client.send(command);
      console.log(`✅ R2Service: File deleted successfully: ${key}`);
      return true;

    } catch (error) {
      console.error(`❌ R2Service: Delete failed for ${key}:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const r2Service = new R2Service();
export default r2Service;
```

### 6. Magic Code Authentication (Customer Login)
Create `src/components/auth/MagicAuth.tsx`:
```typescript
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { db } from '../../lib/instant';

interface MagicAuthProps {
  onSuccess?: () => void;
  title?: string;
  subtitle?: string;
}

export function MagicAuth({ onSuccess, title = "Welcome Back", subtitle = "Sign in to continue shopping" }: MagicAuthProps) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);

  const sendMagicCode = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await db.auth.sendMagicCode({ email: email.trim() });
      setStep('code');
      Alert.alert('Code Sent', `We've sent a verification code to ${email}`);
    } catch (error) {
      console.error('Failed to send magic code:', error);
      Alert.alert('Error', 'Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!code.trim()) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    setLoading(true);
    try {
      await db.auth.signInWithMagicCode({ email: email.trim(), code: code.trim() });
      Alert.alert('Success', 'Welcome! You are now signed in.');
      onSuccess?.();
    } catch (error) {
      console.error('Failed to verify code:', error);
      Alert.alert('Error', 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setStep('email');
    setCode('');
  };

  if (step === 'email') {
    return (
      <View style={{ padding: 24, backgroundColor: 'white', borderRadius: 12, margin: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
          {title}
        </Text>
        <Text style={{ fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 24 }}>
          {subtitle}
        </Text>

        <Text style={{ fontSize: 16, marginBottom: 8, fontWeight: '500' }}>Email Address</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            padding: 16,
            borderRadius: 8,
            fontSize: 16,
            marginBottom: 20
          }}
        />

        <TouchableOpacity
          onPress={sendMagicCode}
          disabled={loading || !email.trim()}
          style={{
            backgroundColor: loading || !email.trim() ? '#ccc' : '#007AFF',
            padding: 16,
            borderRadius: 8,
            alignItems: 'center'
          }}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
            {loading ? 'Sending Code...' : 'Send Verification Code'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ padding: 24, backgroundColor: 'white', borderRadius: 12, margin: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
        Enter Verification Code
      </Text>
      <Text style={{ fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 24 }}>
        We sent a 6-digit code to {email}
      </Text>

      <Text style={{ fontSize: 16, marginBottom: 8, fontWeight: '500' }}>Verification Code</Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        placeholder="123456"
        keyboardType="number-pad"
        maxLength={6}
        style={{
          borderWidth: 1,
          borderColor: '#ddd',
          padding: 16,
          borderRadius: 8,
          fontSize: 18,
          textAlign: 'center',
          letterSpacing: 4,
          marginBottom: 20
        }}
      />

      <TouchableOpacity
        onPress={verifyCode}
        disabled={loading || !code.trim()}
        style={{
          backgroundColor: loading || !code.trim() ? '#ccc' : '#007AFF',
          padding: 16,
          borderRadius: 8,
          alignItems: 'center',
          marginBottom: 12
        }}
      >
        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
          {loading ? 'Verifying...' : 'Verify Code'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={goBack}
        style={{ alignItems: 'center', padding: 8 }}
      >
        <Text style={{ color: '#007AFF', fontSize: 16 }}>
          Use different email
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

## Customer-Facing Page Components

### 1. Store Homepage (Customer View)
Create `src/app/store/[storeId]/index.tsx`:
```typescript
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { db } from '../../../lib/instant';
import { HeroBlock } from '../../../components/blocks/HeroBlock';
import { ProductGridBlock } from '../../../components/blocks/ProductGridBlock';
import { TestimonialsBlock } from '../../../components/blocks/TestimonialsBlock';

export default function StoreHomepage() {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const [blocks, setBlocks] = useState([]);
  const [storeData, setStoreData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch store data and homepage blocks
  const { data, isLoading, error } = db.useQuery({
    storefronts: {
      $: {
        where: {
          storeId: storeId,
          published: true,
        },
      },
    },
    pages: {
      $: {
        where: {
          storeId: storeId,
          type: 'homepage',
          published: true,
        },
      },
    },
    blocks: {
      $: {
        where: {
          storeId: storeId,
        },
        order: {
          order: 'asc',
        },
      },
    },
  });

  useEffect(() => {
    if (data) {
      setStoreData(data.storefronts?.[0]);

      // Get homepage blocks
      const homepagePage = data.pages?.find(p => p.type === 'homepage');
      if (homepagePage) {
        const pageBlocks = data.blocks?.filter(b => b.pageId === homepagePage.id && b.visible !== false) || [];
        setBlocks(pageBlocks);
      }
    }
    setLoading(isLoading);
  }, [data, isLoading]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Refresh will happen automatically due to real-time sync
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>Loading store...</Text>
      </View>
    );
  }

  if (error || !storeData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Store Not Found</Text>
        <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>
          This store is not available or has been temporarily disabled.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f5f5f5' }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Store Header */}
      <View style={{ backgroundColor: 'white', padding: 16, marginBottom: 8 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center' }}>
          {storeData.name}
        </Text>
        {storeData.description && (
          <Text style={{ fontSize: 16, color: '#666', textAlign: 'center', marginTop: 8 }}>
            {storeData.description}
          </Text>
        )}
      </View>

      {/* Dynamic Blocks */}
      {blocks.length > 0 ? (
        blocks.map((block) => (
          <BlockRenderer key={block.id} block={block} storeId={storeId} />
        ))
      ) : (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: '#666' }}>
            Welcome to {storeData.name}! Content is being set up.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function BlockRenderer({ block, storeId }: { block: any; storeId: string }) {
  switch (block.type) {
    case 'hero':
      return <HeroBlock block={block} storeId={storeId} />;
    case 'productGrid':
      return <ProductGridBlock block={block} storeId={storeId} />;
    case 'testimonials':
      return <TestimonialsBlock block={block} storeId={storeId} />;
    case 'text':
      return <TextBlock block={block} />;
    case 'image':
      return <ImageBlock block={block} />;
    default:
      return null;
  }
}

// Simple text block component
function TextBlock({ block }: { block: any }) {
  const { content, style } = block;

  return (
    <View style={{
      backgroundColor: 'white',
      padding: 16,
      marginBottom: 8,
      ...(style?.backgroundColor && { backgroundColor: style.backgroundColor })
    }}>
      <Text style={{
        fontSize: style?.fontSize || 16,
        color: style?.textColor || '#333',
        textAlign: style?.textAlign || 'left',
        lineHeight: style?.lineHeight || 24,
      }}>
        {content?.text || ''}
      </Text>
    </View>
  );
}

// Simple image block component
function ImageBlock({ block }: { block: any }) {
  const { content, style } = block;

  if (!content?.imageUrl) return null;

  return (
    <View style={{ backgroundColor: 'white', marginBottom: 8 }}>
      <Image
        source={{ uri: content.imageUrl }}
        style={{
          width: '100%',
          height: style?.height || 200,
          resizeMode: style?.resizeMode || 'cover',
        }}
      />
      {content?.caption && (
        <Text style={{
          padding: 16,
          fontSize: 14,
          color: '#666',
          textAlign: 'center',
        }}>
          {content.caption}
        </Text>
      )}
    </View>
  );
}
```

### 2. Product Catalog (Customer View)
Create `src/app/store/[storeId]/products/index.tsx`:
```typescript
import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, TextInput, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../../../lib/instant';

export default function ProductCatalog() {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Fetch products and collections
  const { data, isLoading } = db.useQuery({
    products: {
      $: {
        where: {
          storeId: storeId,
          status: true,
          website: true,
        },
      },
    },
    collections: {
      $: {
        where: {
          storeId: storeId,
          isActive: true,
          storefront: true,
        },
      },
    },
  });

  useEffect(() => {
    if (data?.products) {
      setProducts(data.products);
      setFilteredProducts(data.products);
    }
    setLoading(isLoading);
  }, [data, isLoading]);

  // Filter products based on search and category
  useEffect(() => {
    let filtered = products;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(product =>
        (product.name || product.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.blurb || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category/collection
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, selectedCategory]);

  const renderProduct = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={{
        flex: 1,
        margin: 8,
        backgroundColor: 'white',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
      onPress={() => router.push(`/store/${storeId}/products/${item.id}`)}
    >
      {item.image ? (
        <Image
          source={{ uri: item.image }}
          style={{ width: '100%', height: 180, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
          resizeMode="cover"
        />
      ) : (
        <View style={{
          width: '100%',
          height: 180,
          backgroundColor: '#f0f0f0',
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Ionicons name="image-outline" size={48} color="#ccc" />
        </View>
      )}

      <View style={{ padding: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 4 }} numberOfLines={2}>
          {item.name || item.title}
        </Text>

        {item.blurb && (
          <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }} numberOfLines={2}>
            {item.blurb}
          </Text>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            {item.saleprice && item.saleprice < item.price ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#e74c3c' }}>
                  ${item.saleprice}
                </Text>
                <Text style={{ fontSize: 14, color: '#999', textDecorationLine: 'line-through', marginLeft: 8 }}>
                  ${item.price}
                </Text>
              </View>
            ) : (
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>
                ${item.price}
              </Text>
            )}
          </View>

          {item.featured && (
            <View style={{ backgroundColor: '#007AFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
              <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Featured</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCategoryFilter = () => {
    const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];

    return (
      <View style={{ marginBottom: 16 }}>
        <FlatList
          horizontal
          data={categories}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                marginRight: 8,
                backgroundColor: selectedCategory === item ? '#007AFF' : '#f0f0f0',
                borderRadius: 20,
              }}
              onPress={() => setSelectedCategory(item)}
            >
              <Text style={{
                color: selectedCategory === item ? 'white' : '#333',
                fontWeight: selectedCategory === item ? 'bold' : 'normal',
                textTransform: 'capitalize',
              }}>
                {item === 'all' ? 'All Products' : item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <View style={{ backgroundColor: 'white', padding: 16, paddingTop: 60 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
          Products
        </Text>

        {/* Search Bar */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#f0f0f0',
          borderRadius: 8,
          paddingHorizontal: 12,
          marginBottom: 16,
        }}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={{ flex: 1, padding: 12, fontSize: 16 }}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Filter */}
        {renderCategoryFilter()}
      </View>

      {/* Products Grid */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ padding: 8 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Ionicons name="storefront-outline" size={64} color="#ccc" />
            <Text style={{ fontSize: 18, color: '#666', marginTop: 16, textAlign: 'center' }}>
              {searchQuery ? 'No products found matching your search' : 'No products available'}
            </Text>
          </View>
        }
      />
    </View>
  );
}
```

### 3. Shopping Cart
Create `app/store/[storeId]/cart.tsx`:
```typescript
import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../../../contexts/StoreContext';
import db from '../../../lib/instant';

export default function ShoppingCart() {
  const { storeId } = useStore();
  const router = useRouter();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;

    // Fetch cart items for current user
    const { data } = db.useQuery({
      cart: {
        $: {
          where: {
            storeId,
            userId: db.auth.user?.id,
          },
        },
      },
    });

    if (data?.cart) {
      setCartItems(data.cart);
    }
    setLoading(false);
  }, [storeId]);

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      await db.transact(db.tx.cart[itemId].delete());
    } else {
      await db.transact(db.tx.cart[itemId].update({ quantity }));
    }
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const renderCartItem = ({ item }: { item: any }) => (
    <View style={{ flexDirection: 'row', padding: 16, backgroundColor: 'white', marginBottom: 8 }}>
      {item.image && (
        <Image
          source={{ uri: item.image }}
          style={{ width: 80, height: 80, borderRadius: 8 }}
          resizeMode="cover"
        />
      )}
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{item.title}</Text>
        <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
          ${item.price}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <TouchableOpacity
            onPress={() => updateQuantity(item.id, item.quantity - 1)}
            style={{ backgroundColor: '#f0f0f0', padding: 8, borderRadius: 4 }}
          >
            <Text>-</Text>
          </TouchableOpacity>
          <Text style={{ marginHorizontal: 16, fontSize: 16 }}>{item.quantity}</Text>
          <TouchableOpacity
            onPress={() => updateQuantity(item.id, item.quantity + 1)}
            style={{ backgroundColor: '#f0f0f0', padding: 8, borderRadius: 4 }}
          >
            <Text>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading cart...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={cartItems}
        renderItem={renderCartItem}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
      />
      <View style={{ padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e0e0e0' }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
          Total: ${getTotalPrice().toFixed(2)}
        </Text>
        <TouchableOpacity
          onPress={() => router.push(`/store/${storeId}/checkout`)}
          style={{ backgroundColor: '#007AFF', padding: 16, borderRadius: 8 }}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontSize: 16, fontWeight: 'bold' }}>
            Proceed to Checkout
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

## Block Components

### 1. Hero Block
Create `components/blocks/HeroBlock.tsx`:
```typescript
import { View, Text, Image, TouchableOpacity } from 'react-native';

export function HeroBlock({ block }: { block: any }) {
  const { content, style } = block;

  return (
    <View style={{
      height: 400,
      backgroundColor: style?.backgroundColor || '#f0f0f0',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    }}>
      {content?.backgroundImage && (
        <Image
          source={{ uri: content.backgroundImage }}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      )}
      <View style={{ zIndex: 1, alignItems: 'center' }}>
        <Text style={{
          fontSize: style?.titleSize || 32,
          fontWeight: 'bold',
          color: style?.titleColor || '#000',
          textAlign: 'center',
          marginBottom: 16,
        }}>
          {content?.title || 'Welcome to Our Store'}
        </Text>
        <Text style={{
          fontSize: style?.subtitleSize || 18,
          color: style?.subtitleColor || '#666',
          textAlign: 'center',
          marginBottom: 24,
        }}>
          {content?.subtitle || 'Discover amazing products'}
        </Text>
        {content?.ctaText && (
          <TouchableOpacity style={{
            backgroundColor: style?.ctaBackgroundColor || '#007AFF',
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
          }}>
            <Text style={{
              color: style?.ctaTextColor || 'white',
              fontSize: 16,
              fontWeight: 'bold',
            }}>
              {content.ctaText}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
```

### 2. Product Grid Block
Create `components/blocks/ProductGridBlock.tsx`:
```typescript
import { View, Text, FlatList, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../../contexts/StoreContext';
import db from '../../lib/instant';

export function ProductGridBlock({ block }: { block: any }) {
  const { storeId } = useStore();
  const router = useRouter();
  const { content, style } = block;

  const { data } = db.useQuery({
    products: {
      $: {
        where: {
          storeId,
          status: true,
          website: true,
          ...(content?.collectionId && { collectionId: content.collectionId }),
        },
        limit: content?.limit || 8,
      },
    },
  });

  const products = data?.products || [];

  const renderProduct = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={{
        flex: 1,
        margin: 8,
        padding: 16,
        backgroundColor: style?.cardBackgroundColor || 'white',
        borderRadius: style?.cardBorderRadius || 8,
      }}
      onPress={() => router.push(`/store/${storeId}/products/${item.id}`)}
    >
      {item.image && (
        <Image
          source={{ uri: item.image }}
          style={{ width: '100%', height: 200, borderRadius: 8 }}
          resizeMode="cover"
        />
      )}
      <Text style={{
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 8,
        color: style?.titleColor || '#000',
      }}>
        {item.name || item.title}
      </Text>
      <Text style={{
        fontSize: 14,
        color: style?.priceColor || '#666',
        marginTop: 4,
      }}>
        ${item.price}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ padding: 16 }}>
      <Text style={{
        fontSize: style?.titleSize || 24,
        fontWeight: 'bold',
        marginBottom: 16,
        color: style?.titleColor || '#000',
      }}>
        {content?.title || 'Featured Products'}
      </Text>
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={2}
        scrollEnabled={false}
      />
    </View>
  );
}
```

## Deployment Configuration

### 1. Cloudflare Pages Setup
Create `cloudflare-pages.json`:
```json
{
  "build": {
    "command": "npm run build",
    "destination": "dist"
  },
  "routes": [
    {
      "include": "/store/*",
      "destination": "/index.html"
    },
    {
      "include": "/*",
      "destination": "/index.html"
    }
  ]
}
```

### 2. Build Scripts
Update `package.json`:
```json
{
  "scripts": {
    "start": "expo start",
    "web": "expo start --web",
    "build": "expo export --platform web",
    "deploy": "npm run build && wrangler pages publish dist"
  }
}
```

### 3. Environment Variables
Create `.env`:
```
EXPO_PUBLIC_INSTANT_APP_ID=your_instant_app_id
EXPO_PUBLIC_CLOUDFLARE_R2_URL=your_r2_url
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_key
EXPO_PUBLIC_PLATFORM_DOMAIN=yourplatform.com
```

## Custom Domain Setup

### 1. Domain Detection
Create `utils/domainUtils.ts`:
```typescript
export function detectStoreFromDomain(hostname: string): string | null {
  // Handle subdomain pattern: store123.yourplatform.com
  if (hostname.endsWith('.yourplatform.com')) {
    const subdomain = hostname.replace('.yourplatform.com', '');
    return subdomain;
  }

  // Handle custom domains - lookup in database
  return lookupStoreByCustomDomain(hostname);
}

export async function lookupStoreByCustomDomain(domain: string): Promise<string | null> {
  const { data } = await db.queryOnce({
    storefronts: {
      $: {
        where: {
          customDomain: domain,
        },
      },
    },
  });

  return data?.storefronts?.[0]?.id || null;
}
```

## Next Steps

1. **Implement Block System**: Create reusable blocks for hero, product grids, testimonials, etc.
2. **Add Shopping Cart**: Implement cart functionality with InstantDB
3. **Payment Integration**: Add Stripe or similar payment processing
4. **SEO Optimization**: Implement meta tags and structured data
5. **Performance**: Add caching and optimization
6. **Analytics**: Integrate tracking and analytics
7. **Admin Dashboard**: Build content management interface
8. **AI Integration**: Add AI-powered content generation

## Copy Schema and Permissions

### 1. Copy Schema File
Copy the `instant.schema.ts` file from the main TAR app to the storefront app:
```bash
# From the main TAR app directory
cp instant.schema.ts ../storefront/
```

### 2. Copy Permissions File
Copy the `instant.perms.ts` file from the main TAR app:
```bash
# From the main TAR app directory
cp instant.perms.ts ../storefront/
```

### 3. Update Permissions for Storefront
Update `instant.perms.ts` to include storefront-specific permissions:
```typescript
// Add to existing rules
storefronts: {
  allow: {
    view: "true", // Allow public viewing of published storefronts
    create: "auth.id != null",
    update: "isOwner",
    delete: "isOwner",
  },
  bind: ["isOwner", "auth.id != null && auth.id == data.ownerId"],
},

pages: {
  allow: {
    view: "data.published == true || isOwner", // Public can view published pages
    create: "auth.id != null",
    update: "isOwner",
    delete: "isOwner",
  },
  bind: ["isOwner", "auth.id != null && auth.id == data.ownerId"],
},

blocks: {
  allow: {
    view: "data.visible != false", // Public can view visible blocks
    create: "auth.id != null",
    update: "isOwner",
    delete: "isOwner",
  },
  bind: ["isOwner", "auth.id != null && auth.id == data.ownerId"],
},

cart: {
  allow: {
    view: "isOwner",
    create: "auth.id != null",
    update: "isOwner",
    delete: "isOwner",
  },
  bind: ["isOwner", "auth.id != null && auth.id == data.userId"],
},

posts: {
  allow: {
    view: "data.published == true", // Public can view published posts
    create: "auth.id != null",
    update: "isOwner",
    delete: "isOwner",
  },
  bind: ["isOwner", "auth.id != null && auth.id == data.authorId"],
},
```

## Deployment to Cloudflare Pages

### 1. Build Configuration
Create `package.json` scripts:
```json
{
  "scripts": {
    "start": "expo start",
    "web": "expo start --web",
    "build": "expo export --platform web",
    "deploy": "npm run build && wrangler pages publish dist",
    "dev": "expo start --web --dev-client"
  }
}
```

### 2. Cloudflare Pages Configuration
Create `wrangler.toml`:
```toml
name = "storefront"
compatibility_date = "2024-01-01"

[env.production]
name = "storefront"

[env.production.vars]
EXPO_PUBLIC_APP_ENV = "production"

[[env.production.pages_build_output_dir]]
directory = "dist"
```

### 3. Build and Deploy
```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Build the app
npm run build

# Deploy to Cloudflare Pages
wrangler pages publish dist --project-name=storefront
```

### 4. Custom Domain Setup
In Cloudflare Pages dashboard:
1. Go to your storefront project
2. Navigate to "Custom domains"
3. Add your domain (e.g., `stores.yourplatform.com`)
4. Configure DNS records as instructed

## Environment Setup Summary

### Required Environment Variables
```env
# Same InstantDB as main app
EXPO_PUBLIC_INSTANT_APP_ID=your-instant-app-id

# Same R2 configuration as main app
EXPO_PUBLIC_R2_ACCOUNT_ID=your-account-id
EXPO_PUBLIC_R2_ACCESS_KEY_ID=your-access-key
EXPO_PUBLIC_R2_SECRET_ACCESS_KEY=your-secret-key
EXPO_PUBLIC_R2_BUCKET_NAME=your-bucket-name
EXPO_PUBLIC_R2_REGION=auto
EXPO_PUBLIC_R2_ENDPOINT=your-r2-endpoint

# Storefront specific
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_PLATFORM_DOMAIN=yourplatform.com
```

## Key Features Summary

### Customer-Facing Features
- **Multi-tenant storefronts**: Each store gets their own website
- **Dynamic routing**: `/store/[storeId]` or custom domains
- **Product catalog**: Browse and search products
- **Shopping cart**: Add to cart and checkout
- **Magic code authentication**: Secure customer login
- **Responsive design**: Works on all devices
- **Real-time updates**: Content updates instantly
- **SEO optimized**: Meta tags and structured data

### Technical Features
- **Same backend**: Uses existing InstantDB and R2 storage
- **Real-time sync**: Instant updates across all storefronts
- **Scalable**: Single deployment serves millions of stores
- **Cost-effective**: No per-store hosting costs
- **Custom domains**: Customers can use their own domains
- **CDN delivery**: Global performance via Cloudflare

## Next Steps

1. **Create the storefront app** following these instructions
2. **Test with existing store data** from the main TAR app
3. **Configure custom domains** for stores
4. **Add payment processing** (Stripe integration)
5. **Implement SEO features** (meta tags, sitemaps)
6. **Add analytics tracking** (Google Analytics, etc.)
7. **Optimize performance** (caching, lazy loading)

This creates a complete customer-facing e-commerce platform that shares the same backend as your main TAR POS app, providing a seamless experience for store owners and their customers.