import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import Animated, { FadeInUp } from "react-native-reanimated";
import { supabase } from "../../../lib/supabase";

export default function CategoryScreen() {
  const { category } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    fetchCategoryProducts();
  }, [category]);

  const fetchCategoryProducts = async () => {
    try {
      // Fetch all products from all stores
      const { data, error } = await supabase.from("products").select("*");

      if (data) {
        const categoryMapping: Record<string, string[]> = {
          "Fruits": ["fruit", "apple", "mango", "banana", "guava", "orange", "papaya", "grapes"],
          "Vegetables": ["vegetable", "tomato", "mirchi", "onion", "potato", "carrot", "chilli", "pepper", "brinjal", "cabbage", "cauliflower", "okra"],
          "Leafy Greens": ["leaf", "spinach", "mint", "coriander", "methi", "palak", "curry leaves"],
          "Dairy Products": ["dairy", "milk", "cheese", "paneer", "butter", "ghee", "curd", "yogurt"],
          "Grains": ["grain", "wheat", "rice", "oats", "millet", "quinoa"],
          "Pulses": ["pulse", "dal", "lentil", "chana", "moong", "toor", "rajma", "urad"],
          "Organic Snacks": ["snack", "chips", "biscuit", "cookie", "namkeen"],
          "Herbs & Spices": ["herb", "spice", "turmeric", "cumin", "clove", "cardamom", "cinnamon", "garlic", "ginger", "coriander powder", "honey"],
          "Oils": ["oil", "mustard", "coconut", "groundnut", "sunflower", "sesame"],
          "Other Organic Products": ["jaggery", "honey", "sugar", "salt", "vinegar", "organic"]
        };

        const targetCat = String(category);
        const keywords = categoryMapping[targetCat] || [targetCat.toLowerCase()];

        // Filter products that belong to this category based on their DB category or name
        const filteredProducts = data.filter((p: any) => {
          const pName = p.name?.toLowerCase() || "";
          const pCat = p.category?.toLowerCase() || "";
          
          if (pCat === targetCat.toLowerCase()) return true;
          if (pCat.includes(targetCat.toLowerCase())) return true;
          
          return keywords.some(kw => pName.includes(kw) || pCat.includes(kw));
        });

        // Group by product name (case insensitive) to count stores
        const grouped = filteredProducts.reduce((acc: any, curr: any) => {
          const key = curr.name.toLowerCase().trim();
          if (!acc[key]) {
            acc[key] = {
              name: curr.name,
              category: targetCat, // Use the target category name for display
              image_url: curr.image_url,
              storeIds: new Set([curr.store_id]),
            };
          } else {
            acc[key].storeIds.add(curr.store_id);
            if (!acc[key].image_url && curr.image_url) {
              acc[key].image_url = curr.image_url;
            }
          }
          return acc;
        }, {} as Record<string, any>);
        
        const formatted = Object.values(grouped).map((g: any) => ({
          ...g,
          storeCount: g.storeIds.size,
        })).sort((a: any, b: any) => a.name.localeCompare(b.name));
        
        setProducts(formatted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const placeholderImg = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1E261E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{category}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4A6038" />
        </View>
      ) : products.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="basket-outline" size={48} color="#C4CEC4" />
          <Text style={styles.emptyTitle}>No Products Found</Text>
          <Text style={styles.emptySub}>We couldn't find any products in this category.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {products.map((item, index) => (
            <Animated.View key={index} entering={FadeInUp.delay(index * 100)}>
              <TouchableOpacity 
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => router.push(`/(shopper)/product/${encodeURIComponent(item.name)}` as any)}
              >
                <Image source={{ uri: item.image_url || placeholderImg }} style={styles.cardImage} contentFit="cover" />
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.cardCategory}>{item.category}</Text>
                  <View style={styles.storeCountPill}>
                    <Ionicons name="storefront-outline" size={14} color="#4A6038" />
                    <Text style={styles.storeCountText}>{item.storeCount} {item.storeCount === 1 ? 'store' : 'stores'}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#C4CEC4" />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F6E9" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#1E261E", fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1E261E", marginTop: 12 },
  emptySub: { fontSize: 14, color: "#8A998A", marginTop: 4 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 24, padding: 12, shadowColor: "#4A6038", shadowOpacity: 0.06, shadowRadius: 15, elevation: 4 },
  cardImage: { width: 80, height: 80, borderRadius: 16, backgroundColor: "#F4F5E6" },
  cardInfo: { flex: 1, marginLeft: 16, justifyContent: "center" },
  cardName: { fontSize: 16, fontWeight: "800", color: "#1E261E", marginBottom: 4 },
  cardCategory: { fontSize: 12, color: "#8A998A", fontWeight: "600", marginBottom: 8 },
  storeCountPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F4F5E6", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: "flex-start" },
  storeCountText: { fontSize: 12, fontWeight: "700", color: "#4A6038" },
});
