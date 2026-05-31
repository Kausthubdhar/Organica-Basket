import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import Animated, { FadeInUp } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { supabase } from "../../../lib/supabase";

export default function ProductAvailabilityScreen() {
  const { name } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<any[]>([]);

  useEffect(() => {
    fetchProductAvailability();
  }, [name]);

  const fetchProductAvailability = async () => {
    try {
      const { data: productsData, error } = await supabase
        .from("products")
        .select("*")
        .ilike("name", String(name));

      if (productsData && productsData.length > 0) {
        const storeIds = productsData.map(p => p.store_id);
        
        const { data: storesData } = await supabase
          .from("stores")
          .select("*")
          .in("id", storeIds);

        if (storesData) {
          const combined = storesData.map(store => {
            const product = productsData.find(p => p.store_id === store.id);
            return {
              ...store,
              productPrice: product?.price,
              productUnit: product?.unit,
              productImage: product?.image_url,
            };
          });
          setStores(combined);
        }
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
        <Text style={styles.headerTitle} numberOfLines={1}>{name}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4A6038" />
        </View>
      ) : stores.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="storefront-outline" size={48} color="#C4CEC4" />
          <Text style={styles.emptyTitle}>Not Available</Text>
          <Text style={styles.emptySub}>No stores are currently selling this product.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultText}>Available in {stores.length} {stores.length === 1 ? 'store' : 'stores'}</Text>
          </View>
          
          {stores.map((store, index) => {
            const isLive = store.is_accepting_orders;
            
            return (
              <Animated.View key={index} entering={FadeInUp.delay(index * 100)}>
                <View style={styles.storeCard}>
                  <View style={styles.storeCardTop}>
                    <Image source={{ uri: store.image_url || placeholderImg }} style={styles.storeImage} contentFit="cover" />
                    <View style={styles.storeInfo}>
                      <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
                      <View style={styles.locationRow}>
                        <Ionicons name="location-sharp" size={12} color="#FF8C42" />
                        <Text style={styles.locationText} numberOfLines={1}>{store.location || "Nearby Local Farm"}</Text>
                      </View>
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={12} color="#F39C12" />
                        <Text style={styles.ratingText}>4.9</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.divider} />
                  
                  <View style={styles.storeCardBottom}>
                    <View style={styles.priceContainer}>
                      <Text style={styles.priceLabel}>Price</Text>
                      <Text style={styles.priceValue}>₹{store.productPrice} / {store.productUnit}</Text>
                    </View>
                    <View style={styles.statusContainer}>
                      <BlurView intensity={80} tint={isLive ? "light" : "dark"} style={[styles.statusBadge, isLive ? { backgroundColor: "rgba(39, 174, 96, 0.1)" } : null]}>
                        <Text style={[styles.statusBadgeText, isLive ? { color: "#27AE60" } : { color: "#fff" }]}>
                          {isLive ? "AVAILABLE NOW" : "CLOSED"}
                        </Text>
                      </BlurView>
                    </View>
                  </View>
                  
                  <TouchableOpacity 
                    style={[styles.viewStoreBtn, !isLive && styles.viewStoreBtnDisabled]}
                    onPress={() => router.push(`/shop/${store.id}` as any)}
                  >
                    <Text style={[styles.viewStoreBtnText, !isLive && styles.viewStoreBtnTextDisabled]}>
                      View Store
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F6E9" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: "800", color: "#1E261E", fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', textAlign: 'center' },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1E261E", marginTop: 12 },
  emptySub: { fontSize: 14, color: "#8A998A", marginTop: 4 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 20 },
  resultHeader: { marginBottom: 4 },
  resultText: { fontSize: 16, fontWeight: "700", color: "#4A6038" },
  storeCard: { backgroundColor: "#fff", borderRadius: 28, padding: 16, shadowColor: "#4A6038", shadowOpacity: 0.08, shadowRadius: 20, elevation: 6 },
  storeCardTop: { flexDirection: "row", alignItems: "center" },
  storeImage: { width: 64, height: 64, borderRadius: 16, backgroundColor: "#E0E8D8" },
  storeInfo: { flex: 1, marginLeft: 16 },
  storeName: { fontSize: 18, fontWeight: "800", color: "#1E261E", fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', marginBottom: 4 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  locationText: { fontSize: 13, color: "#8A998A", fontWeight: "600" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { fontSize: 12, fontWeight: "800", color: "#F39C12" },
  divider: { height: 1, backgroundColor: "#F0F2D9", marginVertical: 16 },
  storeCardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  priceContainer: {},
  priceLabel: { fontSize: 12, color: "#8A998A", fontWeight: "600", marginBottom: 2 },
  priceValue: { fontSize: 16, fontWeight: "800", color: "#4A6038" },
  statusContainer: {},
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, overflow: "hidden" },
  statusBadgeText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  viewStoreBtn: { backgroundColor: "#4A6038", paddingVertical: 14, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  viewStoreBtnDisabled: { backgroundColor: "#E0E8D8" },
  viewStoreBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  viewStoreBtnTextDisabled: { color: "#8A998A" },
});
