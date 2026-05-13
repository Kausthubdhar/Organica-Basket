import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import * as Haptics from 'expo-haptics';

interface CartItem {
  id: string;
  name: string;
  price: number;
  unit: string;
  image_url: string;
  store_id: string;
  store_name: string;
  quantity: number;
}

interface CartContextType {
  cart: Record<string, number>;
  cartItems: CartItem[];
  updateCart: (product: any, delta: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [productMap, setProductMap] = useState<Record<string, any>>({});

  const updateCart = useCallback((product: any, delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setProductMap(prev => ({
      ...prev,
      [product.id]: product
    }));

    setCart(prev => {
      const current = prev[product.id] || 0;
      const newValue = Math.max(0, current + delta);
      
      const newCart = { ...prev };
      if (newValue === 0) {
        delete newCart[product.id];
      } else {
        newCart[product.id] = newValue;
      }
      return newCart;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart({});
    setProductMap({});
  }, []);

  const cartItems = useMemo(() => {
    return Object.entries(cart).map(([id, quantity]) => ({
      ...productMap[id],
      quantity
    })).filter(item => item.id);
  }, [cart, productMap]);

  const totalItems = useMemo(() => {
    return Object.values(cart).reduce((a, b) => a + b, 0);
  }, [cart]);

  const totalPrice = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }, [cartItems]);

  return (
    <CartContext.Provider value={{ cart, cartItems, updateCart, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
