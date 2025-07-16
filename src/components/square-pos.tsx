import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, FlatList, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { db, formatCurrency } from '../lib/instant';
import { useStore } from '../lib/store-context';
import { id } from '@instantdb/react-native';
import { hapticFeedback } from '../lib/haptics';
import R2Image from './ui/r2-image';

interface Product {
  id: string;
  title: string;
  image?: string;
  price?: number;
  saleprice?: number;
  pos?: boolean;
  category?: string;
  item?: Array<{
    id: string;
    sku: string;
    price?: number;
    saleprice?: number;
    option1?: string;
    option2?: string;
    option3?: string;
  }>;
}

interface CartItem {
  id: string;
  productId: string;
  itemId?: string;
  title: string;
  variantTitle?: string;
  price: number;
  qty: number;
  total: number;
  image?: string;
}

interface SquarePOSProps {
  onClose: () => void;
  onOrderCreated?: (orderId: string) => void;
}

type TabType = 'keypad' | 'library' | 'favourites';

export default function SquarePOS({ onClose, onOrderCreated }: SquarePOSProps) {
  const insets = useSafeAreaInsets();
  const { currentStore } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Query products from InstantDB
  const { data, isLoading } = db.useQuery({
    products: {
      item: {},
      $: {
        where: {
          storeId: currentStore?.id || '',
          pos: true,
        },
        order: {
          serverCreatedAt: 'desc'
        }
      }
    }
  });

  const products = data?.products || [];

  // Group products by category
  const categorizedProducts = useMemo(() => {
    const categories: { [key: string]: Product[] } = {};
    
    products.forEach((product: Product) => {
      const category = product.category || 'Other';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(product);
    });

    return categories;
  }, [products]);

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products.slice(0, 20);
    
    const query = searchQuery.toLowerCase();
    return products.filter((product: Product) =>
      (product.title || '').toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  // Calculate cart total
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  }, [cart]);

  const addToCart = (product: Product) => {
    hapticFeedback.light();
    
    // Check if product has variants
    if (product.item && product.item.length > 0) {
      const firstVariant = product.item[0];
      const variantTitle = [firstVariant.option1, firstVariant.option2, firstVariant.option3]
        .filter(Boolean)
        .join(' / ');
      
      const price = firstVariant.saleprice || firstVariant.price || product.saleprice || product.price || 0;
      
      const existingItem = cart.find(item => 
        item.productId === product.id && item.itemId === firstVariant.id
      );
      
      if (existingItem) {
        updateQuantity(existingItem.id, existingItem.qty + 1);
      } else {
        const newItem: CartItem = {
          id: id(),
          productId: product.id,
          itemId: firstVariant.id,
          title: product.title,
          variantTitle: variantTitle || undefined,
          price,
          qty: 1,
          total: price,
          image: product.image
        };
        setCart(prev => [...prev, newItem]);
      }
    } else {
      // Product without variants
      const price = product.saleprice || product.price || 0;
      const existingItem = cart.find(item => item.productId === product.id);
      
      if (existingItem) {
        updateQuantity(existingItem.id, existingItem.qty + 1);
      } else {
        const newItem: CartItem = {
          id: id(),
          productId: product.id,
          title: product.title,
          price,
          qty: 1,
          total: price,
          image: product.image
        };
        setCart(prev => [...prev, newItem]);
      }
    }
  };

  const updateQuantity = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      setCart(prev => prev.filter(item => item.id !== itemId));
      return;
    }
    
    setCart(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, qty: newQty, total: item.price * newQty }
        : item
    ));
  };

  const generateOrderNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `#${1000 + parseInt(timestamp.slice(-3))}`;
  };

  const processPayment = async (paymentMethod: 'cash' | 'card') => {
    if (!currentStore?.id) {
      Alert.alert('Error', 'Please select a store first');
      return;
    }

    setIsProcessing(true);
    try {
      const orderId = id();
      const orderNumber = generateOrderNumber();
      
      const orderData = {
        storeId: currentStore.id,
        orderNumber,
        referid: orderId,
        createdat: new Date(),
        status: 'completed',
        fulfillmentStatus: 'fulfilled',
        paymentStatus: 'paid',
        currency: 'USD',
        subtotal: cartTotal,
        discountAmount: 0,
        shippingAmount: 0,
        taxAmount: 0,
        total: cartTotal,
        totalPaid: cartTotal,
        totalRefunded: 0,
        source: 'pos',
        market: 'pos',
        notes: `Payment method: ${paymentMethod}`,
      };

      // Create order items
      const orderItemTransactions = cart.map(item => {
        const itemId = id();
        return db.tx.orderitems[itemId].update({
          orderid: orderId,
          productId: item.productId,
          itemId: item.itemId,
          sku: item.title?.toUpperCase().replace(/\s+/g, '-') || 'ITEM',
          title: item.title,
          variantTitle: item.variantTitle,
          qty: item.qty,
          price: item.price,
          taxRate: 0,
          taxAmount: 0,
          discountAmount: 0,
          lineTotal: item.total,
          storeId: currentStore.id,
          productImage: item.image,
          fulfillmentStatus: 'fulfilled'
        });
      });

      // Execute transaction
      await db.transact([
        db.tx.orders[orderId].update(orderData),
        ...orderItemTransactions
      ]);

      hapticFeedback.success();
      
      // Reset and close
      setCart([]);
      setShowPayment(false);
      setShowReview(false);
      onOrderCreated?.(orderId);
      onClose();
      
    } catch (error) {
      console.error('Error processing payment:', error);
      hapticFeedback.error();
      Alert.alert('Error', 'Failed to process payment');
    } finally {
      setIsProcessing(false);
    }
  };

  // Payment Screen - Clean White Background with Flat List Design
  if (showPayment) {
    return (
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top + 10 }}>
        {/* Simple Header */}
        <View className="px-6 py-6 bg-white border-b border-gray-200">
          <View className="flex-row items-center">
            <TouchableOpacity 
              onPress={() => setShowPayment(false)}
              className="mr-4"
            >
              <Feather name="arrow-left" size={24} color="#000000" />
            </TouchableOpacity>
            <Text className="text-xl font-medium text-black">Payment</Text>
          </View>
        </View>

        {/* Total Amount - Centered and Clean */}
        <View className="flex-1 justify-center items-center px-6">
          <View className="items-center mb-16">
            <Text className="text-gray-600 text-lg mb-4">Total</Text>
            <Text className="text-6xl font-light text-black mb-20">
              {formatCurrency(cartTotal)}
            </Text>
          </View>

          {/* Payment Methods - Flat List Items */}
          <View className="w-full">
            <TouchableOpacity
              onPress={() => processPayment('cash')}
              disabled={isProcessing}
              className="flex-row items-center py-6 px-6 border-b border-gray-200"
            >
              <Feather name="dollar-sign" size={24} color="#000000" />
              <Text className="text-black text-xl font-medium ml-4">Cash</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => processPayment('card')}
              disabled={isProcessing}
              className="flex-row items-center py-6 px-6"
            >
              <Feather name="credit-card" size={24} color="#000000" />
              <Text className="text-black text-xl font-medium ml-4">Card</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Safe Area */}
        <View style={{ paddingBottom: Math.max(insets.bottom, 16) }} />

        {/* Processing Indicator */}
        {isProcessing && (
          <View className="absolute inset-0 bg-black/20 items-center justify-center">
            <View className="bg-white px-8 py-6 rounded-2xl items-center">
              <Text className="text-black text-lg font-medium">Processing...</Text>
            </View>
          </View>
        )}
      </View>
    );
  }

  // Review Screen - Clean, Simple, Flat Design
  if (showReview) {
    return (
      <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top + 10 }}>
        {/* Simple Header */}
        <View className="px-6 py-6 bg-white">
          <View className="flex-row items-center">
            <TouchableOpacity 
              onPress={() => setShowReview(false)}
              className="mr-4"
            >
              <Feather name="arrow-left" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-xl font-medium text-gray-900">Review Sale</Text>
          </View>
        </View>

        {/* Cart Items - Clean List */}
        <ScrollView className="flex-1 px-6 py-4">
          {cart.map((item) => (
            <View key={item.id} className="bg-white p-4 mb-3 flex-row items-center justify-between" style={{ borderRadius: 8 }}>
              <View className="flex-1">
                <Text className="text-lg font-medium text-gray-900">{item.title}</Text>
                {item.variantTitle && (
                  <Text className="text-gray-500 text-sm mt-1">{item.variantTitle}</Text>
                )}
                <Text className="text-gray-600 text-sm mt-1">Qty: {item.qty}</Text>
              </View>
              <Text className="text-lg font-semibold text-gray-900">
                {formatCurrency(item.total)}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Total and Continue - Fixed Bottom */}
        <View className="bg-white px-6 py-6" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-2xl font-medium text-gray-900">Total</Text>
            <Text className="text-3xl font-light text-gray-900">
              {formatCurrency(cartTotal)}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setShowPayment(true)}
            className="bg-blue-500 py-4 items-center"
            style={{ borderRadius: 12 }}
          >
            <Text className="text-white text-xl font-medium">Continue to Payment</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Main POS Screen - Full Screen Layout
  return (
    <View className="flex-1 bg-white">
      {/* Tabs - No top padding, full screen */}
      <View className="bg-white px-4 py-3 border-b border-gray-200" style={{ paddingTop: insets.top + 20 }}>
        <View className="flex-row">
          {[
            { key: 'keypad', label: 'Keypad' },
            { key: 'library', label: 'Library' },
            { key: 'favourites', label: 'Favourites' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key as TabType)}
              className={`flex-1 py-3 mx-1 rounded-lg ${
                activeTab === tab.key ? 'bg-blue-100' : 'bg-gray-100'
              }`}
            >
              <Text className={`text-center font-medium ${
                activeTab === tab.key ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Main Content - Single Column Layout */}
      <View className="flex-1">
        {/* Search */}
        <View className="px-4 py-3 bg-white border-b border-gray-200">
          <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
            <Feather name="search" size={20} color="#6B7280" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search all items"
              className="flex-1 ml-2 text-base"
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity>
              <Feather name="plus" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Categories and Products */}
        <ScrollView className="flex-1 bg-white">
          {/* Quick Actions */}
          <View className="px-4 py-2">
            {[
              { icon: 'package', label: 'Items', color: 'bg-blue-600' },
              { icon: 'gift', label: 'Rewards', color: 'bg-blue-600' },
              { icon: 'tag', label: 'Discounts', color: 'bg-blue-600' },
              { icon: 'calendar', label: 'Services', color: 'bg-blue-600' }
            ].map((action, index) => (
              <TouchableOpacity
                key={action.label}
                className="flex-row items-center py-4 border-b border-gray-100"
              >
                <View className={`w-10 h-10 ${action.color} rounded items-center justify-center mr-4`}>
                  <Feather name={action.icon as any} size={20} color="white" />
                </View>
                <Text className="flex-1 text-lg font-medium text-gray-900">{action.label}</Text>
                <Feather name="chevron-right" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Categories */}
          {Object.entries(categorizedProducts).map(([category, categoryProducts]) => (
            <View key={category} className="px-4 py-2">
              <TouchableOpacity className="flex-row items-center justify-between py-4 border-b border-gray-100">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-gray-400 rounded items-center justify-center mr-4">
                    <Text className="text-white font-bold text-lg">
                      {category.substring(0, 2)}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-lg font-medium text-gray-900">{category}</Text>
                    <Text className="text-gray-500">{categoryProducts.length} items</Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          ))}

          {/* Individual Products */}
          {filteredProducts.slice(0, 10).map((product: Product) => {
            const price = product.saleprice || product.price || 0;
            return (
              <TouchableOpacity
                key={product.id}
                onPress={() => addToCart(product)}
                className="px-4 py-3 border-b border-gray-100"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View className="w-10 h-10 bg-orange-500 rounded items-center justify-center mr-4">
                      <Text className="text-white font-bold text-lg">
                        {(product.title || 'P').substring(0, 2)}
                      </Text>
                    </View>
                    <Text className="text-lg font-medium text-gray-900 flex-1">
                      {product.title}
                    </Text>
                  </View>
                  <Text className="text-lg font-bold text-gray-900">
                    {formatCurrency(price)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Bottom Section - Cart Summary and Review Button */}
        {cart.length > 0 && (
          <View className="bg-white border-t border-gray-200">
            {/* Cart Items Summary */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              className="px-4 py-3 border-b border-gray-100"
              style={{ maxHeight: 80 }}
            >
              <View className="flex-row">
                {cart.map((item, index) => (
                  <View key={item.id} className="mr-4 bg-gray-50 rounded-lg px-3 py-2 min-w-[120px]">
                    <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View className="flex-row items-center justify-between mt-1">
                      <Text className="text-xs text-gray-500">Qty: {item.qty}</Text>
                      <Text className="text-sm font-bold text-gray-900">
                        {formatCurrency(item.total)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Total and Review Button */}
            <View className="px-4 py-4" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text className="text-sm text-gray-500">Total</Text>
                  <Text className="text-2xl font-bold text-gray-900">
                    {formatCurrency(cartTotal)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowReview(true)}
                  className="bg-blue-600 px-8 py-4 rounded-xl"
                >
                  <Text className="text-white text-lg font-bold">
                    Review sale ({cart.length} items)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}