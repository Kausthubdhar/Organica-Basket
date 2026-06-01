import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import Animated, { FadeInUp } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { supabase } from "../../lib/supabase";
import { useCart } from "../../context/CartContext";

export default function StoreCategoryDetail() {
  const { storeId, category } = useLocalSearchParams();
  const router = useRouter();
  
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { cart, updateCart } = useCart();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  useEffect(() => {
    fetchStoreAndProducts();
  }, [storeId, category]);

  const fetchStoreAndProducts = async () => {
    try {
      // Fetch Store Info
      const { data: storeData } = await supabase
        .from("stores")
        .select("*")
        .eq("id", storeId)
        .single();
      setStore(storeData);

      // Fetch Products
      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", storeId)
        .eq("category", category);
        
      setProducts(productsData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderProductCard = (item: any, index: number) => {
    const QuickAdd = () => (
      <BlurView intensity={80} style={styles.bentoGlassControl} tint="light">
        {(cart[item.id] || 0) > 0 ? (
          <View style={styles.bentoQtyControl}>
            <TouchableOpacity onPress={() => updateCart({ ...item, store_name: store?.name }, -1)} style={styles.bentoQtyBtn}><Ionicons name="remove" size={16} color="#1E261E" /></TouchableOpacity>
            <Text style={styles.bentoQtyVal}>{cart[item.id]}</Text>
            <TouchableOpacity onPress={() => updateCart({ ...item, store_name: store?.name }, 1)} style={styles.bentoQtyBtn}><Ionicons name="add" size={16} color="#1E261E" /></TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            onPress={() => updateCart({ ...item, store_name: store?.name }, 1)} 
            disabled={!store?.is_accepting_orders}
            style={[styles.bentoAddBtn, !store?.is_accepting_orders ? { opacity: 0.5 } : null]}
          >
            <Ionicons name="add" size={20} color="#1E261E" />
          </TouchableOpacity>
        )}
      </BlurView>
    );

    return (
      <Animated.View key={item.id} entering={FadeInUp.delay(index * 50)} style={styles.listCard}>
        <TouchableOpacity 
          activeOpacity={0.9} 
          onPress={() => setSelectedProduct(item)}
          style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
        >
          <View style={styles.listInfo}>
            <Text style={styles.bentoName} numberOfLines={1}>{item.name}</Text>
            {item.description && <Text style={styles.listDesc} numberOfLines={2}>{item.description}</Text>}
            <Text style={styles.bentoPrice}>₹{item.price} / {item.unit}</Text>
          </View>
          <View style={styles.listImageContainer}>
            <Image source={{ uri: item.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800" }} style={styles.bentoImg} contentFit="cover" />
            <QuickAdd />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]} edges={["top"]}>
        <ActivityIndicator size="large" color="#4A6038" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1E261E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{category}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.storeContextRow}>
          <Ionicons name="storefront" size={16} color="#8A998A" />
          <Text style={styles.storeContextText}>{store?.name}</Text>
        </View>

        {products.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="basket-outline" size={48} color="#C4CEC4" />
            <Text style={styles.emptyTitle}>No Products Found</Text>
            <Text style={styles.emptySub}>This category doesn't have any products available at the moment.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {products.map((item, index) => renderProductCard(item, index))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={!!selectedProduct}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedProduct(null)}
      >
        <View style={styles.modalContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Image 
                source={{ uri: selectedProduct?.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800" }} 
                style={styles.modalHeroImage} 
              />
              <TouchableOpacity 
                style={styles.modalCloseBtn} 
                onPress={() => setSelectedProduct(null)}
              >
                <BlurView intensity={60} tint="light" style={styles.modalCloseBlur}>
                  <Ionicons name="close" size={24} color="#1E261E" />
                </BlurView>
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <View style={styles.modalTitleRow}>
                <Text style={styles.modalTitle}>{selectedProduct?.name}</Text>
                <Text style={styles.modalPrice}>₹{selectedProduct?.price} / {selectedProduct?.unit}</Text>
              </View>
              <Text style={styles.modalCategory}>{selectedProduct?.category}</Text>
              {selectedProduct?.description && (
                <Text style={styles.modalDescription}>{selectedProduct.description}</Text>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F6E9" },
  center: { justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: "800", color: "#1E261E", fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', textAlign: 'center' },
  scroll: { paddingBottom: 40 },
  storeContextRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 20, alignSelf: "center", backgroundColor: "#F0F2D9", paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20 },
  storeContextText: { fontSize: 13, color: "#4A6038", fontWeight: "600" },
  listContainer: { paddingHorizontal: 20, gap: 16 },
  listCard: { backgroundColor: "#fff", borderRadius: 24, padding: 12, shadowColor: "#4A6038", shadowOpacity: 0.05, shadowRadius: 15, elevation: 4 },
  listInfo: { flex: 1, paddingRight: 16 },
  bentoName: { fontSize: 16, fontWeight: "800", color: "#1E261E", marginBottom: 4 },
  listDesc: { fontSize: 12, color: "#8A998A", marginBottom: 8, lineHeight: 16 },
  bentoPrice: { fontSize: 14, fontWeight: "800", color: "#4A6038" },
  listImageContainer: { position: "relative" },
  bentoImg: { width: 90, height: 90, borderRadius: 16, backgroundColor: "#F4F5E6" },
  bentoGlassControl: { position: "absolute", bottom: -10, alignSelf: "center", borderRadius: 20, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.8)" },
  bentoAddBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  bentoQtyControl: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 8, paddingVertical: 4 },
  bentoQtyBtn: { padding: 4 },
  bentoQtyVal: { fontSize: 14, fontWeight: "800", color: "#4A6038", width: 16, textAlign: "center" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1E261E", marginTop: 12, marginBottom: 6 },
  emptySub: { fontSize: 14, color: "#8A998A", textAlign: "center" },
  modalContainer: { flex: 1, backgroundColor: "#F5F6E9" },
  modalHeader: { position: "relative" },
  modalHeroImage: { width: "100%", height: 300, backgroundColor: "#E0E8D8" },
  modalCloseBtn: { position: "absolute", top: 20, right: 20, borderRadius: 20, overflow: "hidden" },
  modalCloseBlur: { width: 40, height: 40, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(255,255,255,0.7)" },
  modalContent: { padding: 24 },
  modalTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  modalTitle: { flex: 1, fontSize: 24, fontWeight: "800", color: "#1E261E", fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', marginRight: 16 },
  modalPrice: { fontSize: 20, fontWeight: "800", color: "#FF8C42" },
  modalCategory: { fontSize: 14, color: "#4A6038", fontWeight: "700", marginBottom: 20, letterSpacing: 0.5, textTransform: "uppercase" },
  modalDescription: { fontSize: 16, color: "#5A665A", lineHeight: 24, marginBottom: 30 },
});
