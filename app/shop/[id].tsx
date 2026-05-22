import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Platform,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import Animated, { 
  FadeInDown, 
  FadeInUp, 
  SlideInDown, 
  useAnimatedStyle, 
  withTiming, 
  interpolate,
  useSharedValue
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { supabase } from "../../lib/supabase";
import { useCart } from "../../context/CartContext";

const { width } = Dimensions.get("window");

export default function StoreDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { cart, updateCart, totalItems, totalPrice } = useCart();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const searchWidth = useSharedValue(0);

  const categories = ["All", ...new Set(products.map(p => p.category).filter(Boolean))];

  const fetchStoreAndProducts = React.useCallback(async () => {
    try {
      // Fetch Store Info
      const { data: storeData } = await supabase
        .from("stores")
        .select("*")
        .eq("id", id)
        .single();
      setStore(storeData);

      // Fetch Products
      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", id);
      setProducts(productsData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchStoreAndProducts();
  }, [fetchStoreAndProducts]);


  const toggleSearch = () => {
    if (isSearchExpanded) {
      searchWidth.value = withTiming(0, { duration: 300 });
      setSearchQuery("");
      setIsSearchExpanded(false);
    } else {
      searchWidth.value = withTiming(1, { duration: 300 });
      setIsSearchExpanded(true);
    }
  };

  const animatedHeaderInfoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchWidth.value, [0, 0.5, 1], [1, 0, 0]),
    transform: [{ scale: interpolate(searchWidth.value, [0, 1], [1, 0.9]) }],
  }));

  const animatedSearchStyle = useAnimatedStyle(() => ({
    width: interpolate(searchWidth.value, [0, 1], [0, width - 100]),
    opacity: interpolate(searchWidth.value, [0, 0.2, 1], [0, 1, 1]),
  }));

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#4A6038" /></View>;

  const getLayoutType = (categoryName: string) => {
    const validCategories = categories.filter(c => c !== "All");
    const index = validCategories.indexOf(categoryName);
    const layouts = ['horizontal', 'grid', 'list'];
    return layouts[Math.max(0, index) % layouts.length];
  };

  const categoriesToRender = activeCategory === "All" ? categories.filter(c => c !== "All") : [activeCategory];

  const renderProductCard = (item: any, index: number, layout: string) => {
    const isHorizontal = layout === 'horizontal';
    const isList = layout === 'list';
    
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

    if (isList) {
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
    }

    return (
      <Animated.View 
        key={item.id} 
        entering={FadeInUp.delay(index * 50)}
        style={isHorizontal ? styles.horizontalCard : styles.bentoCard}
      >
        <TouchableOpacity 
          activeOpacity={0.9} 
          onPress={() => setSelectedProduct(item)}
          style={{ flex: 1 }}
        >
          <View style={styles.bentoImageContainer}>
            <Image source={{ uri: item.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800" }} style={styles.bentoImg} contentFit="cover" />
            <QuickAdd />
          </View>
          <View style={styles.bentoInfo}>
            <Text style={styles.bentoName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.bentoPrice}>₹{item.price} / {item.unit}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1E261E" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Animated.View style={[styles.headerInfo, animatedHeaderInfoStyle]}>
            <Text style={styles.storeName}>{store?.name}</Text>
            <View style={styles.trustRow}>
              <MaterialCommunityIcons name="shield-check" size={14} color="#4A6038" />
              <Text style={styles.trustText}>TRUST SCORE 4.8</Text>
            </View>
          </Animated.View>

          <Animated.View style={[styles.expandingSearchContainer, animatedSearchStyle]}>
            <BlurView intensity={20} style={styles.searchBlur} tint="light">
              <TextInput 
                placeholder="Search products..." 
                style={styles.headerSearchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={isSearchExpanded}
              />
            </BlurView>
          </Animated.View>
        </View>

        <TouchableOpacity onPress={toggleSearch} style={styles.searchToggleBtn}>
          <Ionicons name={isSearchExpanded ? "close" : "search"} size={22} color="#1E261E" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        
        {/* Store Location Info */}
        <Animated.View entering={FadeInDown} style={styles.storeLocationSection}>
          <View style={styles.locationMainRow}>
            <Ionicons name="location" size={18} color="#4A6038" />
            <Text style={styles.locationMainText}>{store?.location || "Nearby"}</Text>
          </View>
          {store?.address && (
            <View style={styles.addressRow}>
              <Text style={styles.addressText}>{store.address}</Text>
            </View>
          )}
        </Animated.View>



        {/* Live Broadcast & Delivery Info */}
        {(store?.status_message || store?.next_delivery_date) && (
          <Animated.View entering={FadeInUp.delay(100)} style={styles.broadcastInfoSection}>
            {store?.status_message && (
              <View style={styles.statusBanner}>
                <Ionicons name="megaphone" size={18} color="#4A6038" />
                <Text style={styles.statusText}>{store.status_message}</Text>
              </View>
            )}
            {store?.next_delivery_date && (
              <View style={styles.deliveryCard}>
                <View style={styles.deliveryRow}>
                  <Ionicons name="calendar-outline" size={16} color="#FF8C42" />
                  <Text style={styles.deliveryLabel}>Next Harvest Delivery:</Text>
                </View>
                <Text style={styles.deliveryValue}>
                  {new Date(store.next_delivery_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Categories */}
        <Text style={styles.sectionTitle}>Browse by Harvest</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {categories.map(cat => (
            <TouchableOpacity 
              key={cat} 
              onPress={() => setActiveCategory(cat)}
              style={[styles.catBtn, activeCategory === cat ? styles.catBtnActive : null]}
            >
              <Text style={[styles.catBtnText, activeCategory === cat ? styles.catBtnTextActive : null]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Dynamic Mixed Layouts */}
        <View style={styles.dynamicSections}>
          {categoriesToRender.map((cat) => {
            const catProducts = products.filter(p => 
              p.category === cat && 
              (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
               p.description?.toLowerCase().includes(searchQuery.toLowerCase()))
            );
            if (catProducts.length === 0) return null;
            const layout = getLayoutType(cat);

            return (
              <View key={cat} style={styles.categorySection}>
                {activeCategory === "All" && (
                  <View style={styles.categoryHeader}>
                    <Text style={styles.categoryTitle}>{cat}</Text>
                    <TouchableOpacity>
                      <Text style={styles.seeAllText}>See all <Ionicons name="chevron-forward" size={12} /></Text>
                    </TouchableOpacity>
                  </View>
                )}

                {layout === 'horizontal' && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                    {catProducts.map((item, index) => renderProductCard(item, index, layout))}
                  </ScrollView>
                )}

                {layout === 'grid' && (
                  <View style={styles.bentoGrid}>
                    {catProducts.map((item, index) => renderProductCard(item, index, layout))}
                  </View>
                )}

                {layout === 'list' && (
                  <View style={styles.listContainer}>
                    {catProducts.map((item, index) => renderProductCard(item, index, layout))}
                  </View>
                )}
              </View>
            );
          })}
        </View>

      </ScrollView>

      {/* Product Detail Modal */}
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
              <View style={styles.modalMainInfo}>
                <Text style={styles.modalTitle}>{selectedProduct?.name}</Text>
                <Text style={styles.modalPrice}>₹{selectedProduct?.price} / {selectedProduct?.unit}</Text>
              </View>

              <Text style={styles.modalCategory}>{selectedProduct?.category}</Text>

              <View style={styles.modalMinimalInfo}>
                <View style={styles.modalInfoChip}>
                  <Ionicons name="leaf-outline" size={16} color="#4A6038" />
                  <Text style={styles.modalInfoText}>Organic</Text>
                </View>
                <View style={styles.modalInfoChip}>
                  <Ionicons name="flash-outline" size={16} color="#FF8C42" />
                  <Text style={styles.modalInfoText}>Fresh</Text>
                </View>
                <View style={styles.modalInfoChip}>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#4A6038" />
                  <Text style={styles.modalInfoText}>Verified</Text>
                </View>
              </View>

              <Text style={styles.modalDescription}>
                {selectedProduct?.description || "Fresh from the local farm to your doorstep. Grown with love and care for your health and the environment."}
              </Text>
            </View>
          </ScrollView>

          {/* Modal Footer (Proper Add to Cart) */}
          <BlurView intensity={90} tint="light" style={styles.modalFooter}>
            {(cart[selectedProduct?.id] || 0) > 0 ? (
              <View style={styles.modalQtyActionRow}>
                <View style={styles.modalQtySelector}>
                  <TouchableOpacity 
                    style={styles.modalQtyBtn}
                    onPress={() => updateCart(selectedProduct, -1)}
                  >
                    <Ionicons name="remove" size={20} color="#1E261E" />
                  </TouchableOpacity>
                  <Text style={styles.modalQtyVal}>{cart[selectedProduct?.id] || 0}</Text>
                  <TouchableOpacity 
                    style={styles.modalQtyBtn}
                    onPress={() => updateCart(selectedProduct, 1)}
                  >
                    <Ionicons name="add" size={20} color="#1E261E" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity 
                  style={styles.modalDoneBtn}
                  onPress={() => setSelectedProduct(null)}
                >
                  <Text style={styles.modalDoneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.modalPrimaryAddBtn, !store?.is_accepting_orders && { opacity: 0.5 }]}
                disabled={!store?.is_accepting_orders}
                onPress={() => {
                  if ((cart[selectedProduct?.id] || 0) === 0) updateCart({ ...selectedProduct, store_name: store?.name }, 1);
                  setSelectedProduct(null);
                }}
              >
                <Ionicons name="basket" size={20} color="#fff" style={{ marginRight: 10 }} />
                <Text style={styles.modalPrimaryAddText}>
                  {store?.is_accepting_orders ? "Add to Basket" : "Store Closed"}
                </Text>
              </TouchableOpacity>
            )}
          </BlurView>
        </View>
      </Modal>

      {/* Floating Cart Bar */}
      {totalItems > 0 && (
        <Animated.View entering={SlideInDown} style={styles.cartBarContainer}>
          <BlurView intensity={90} style={styles.cartBar}>
            <View style={styles.cartIconBox}>
              <Ionicons name="basket" size={24} color="#fff" />
              <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{totalItems}</Text></View>
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.cartBarTitle}>Go to Cart</Text>
              <Text style={styles.cartBarSub}>{totalItems} Items • ₹{totalPrice}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/(shopper)/basket" as any)} style={styles.checkoutBtn}>
              <Ionicons name="arrow-forward" size={24} color="#fff" />
            </TouchableOpacity>
          </BlurView>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F6E9" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, backgroundColor: "#F5F6E9" },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerInfo: { alignItems: "center" },
  headerCenter: { flex: 1, justifyContent: "center", alignItems: "center" },
  expandingSearchContainer: { position: "absolute", height: 44, borderRadius: 22, overflow: "hidden", backgroundColor: "#fff", borderWidth: 1, borderColor: "#F0F2D9" },
  searchBlur: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 16 },
  headerSearchInput: { flex: 1, fontSize: 14, color: "#1E261E", fontWeight: "600" },
  searchToggleBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "flex-end" },
  storeName: { fontSize: 20, fontWeight: "800", color: "#1E261E", fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  trustRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  trustText: { fontSize: 10, fontWeight: "800", color: "#4A6038", letterSpacing: 0.5 },
  searchIcon: { width: 40, height: 40, alignItems: "flex-end", justifyContent: "center" },
  scroll: { paddingBottom: 150 },
  searchContainer: { paddingHorizontal: 20, marginTop: 20, marginBottom: 30 },
  searchInputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 16, height: 56, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 15, color: "#1E261E" },
  sectionTitle: { fontSize: 24, fontWeight: "700", color: "#1E261E", paddingHorizontal: 20, marginBottom: 16, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  catScroll: { paddingHorizontal: 20, gap: 12, marginBottom: 32 },
  catBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25, backgroundColor: "#fff" },
  catBtnActive: { backgroundColor: "#4A6038" },
  catBtnText: { fontSize: 14, fontWeight: "700", color: "#4A6038" },
  catBtnTextActive: { color: "#fff" },
  bentoGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 20, gap: 16 },
  bentoCard: { width: "47%", backgroundColor: "#fff", borderRadius: 28, padding: 8, shadowColor: "#4A6038", shadowOpacity: 0.05, shadowRadius: 15, elevation: 3 },
  horizontalCard: { width: 180, backgroundColor: "#fff", borderRadius: 28, padding: 8, shadowColor: "#4A6038", shadowOpacity: 0.05, shadowRadius: 15, elevation: 3 },
  bentoImageContainer: { width: "100%", height: 160, borderRadius: 20, overflow: "hidden", backgroundColor: "#F4F5E6", marginBottom: 12 },
  bentoImg: { width: "100%", height: "100%" },
  bentoGlassControl: { position: "absolute", bottom: 8, right: 8, borderRadius: 16, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.7)" },
  bentoQtyControl: { flexDirection: "row", alignItems: "center", padding: 4 },
  bentoQtyBtn: { width: 32, height: 32, justifyContent: "center", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5 },
  bentoQtyVal: { paddingHorizontal: 12, fontSize: 14, fontWeight: "800", color: "#1E261E" },
  bentoAddBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5 },
  bentoInfo: { paddingHorizontal: 4, paddingBottom: 8 },
  bentoName: { fontSize: 16, fontWeight: "800", color: "#1E261E", marginBottom: 4 },
  bentoPrice: { fontSize: 14, fontWeight: "800", color: "#4A6038" },
  dynamicSections: { paddingBottom: 40 },
  categorySection: { marginBottom: 32 },
  categoryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 16 },
  categoryTitle: { fontSize: 20, fontWeight: "800", color: "#1E261E", fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  seeAllText: { fontSize: 13, fontWeight: "700", color: "#4A6038" },
  horizontalScroll: { paddingHorizontal: 20, gap: 16 },
  listContainer: { paddingHorizontal: 20, gap: 16 },
  listCard: { backgroundColor: "#fff", borderRadius: 28, padding: 8, shadowColor: "#4A6038", shadowOpacity: 0.05, shadowRadius: 15, elevation: 3 },
  listImageContainer: { width: 110, height: 110, borderRadius: 20, overflow: "hidden", backgroundColor: "#F4F5E6" },
  listInfo: { flex: 1, paddingHorizontal: 12, justifyContent: "center" },
  listDesc: { fontSize: 12, color: "#8A998A", lineHeight: 18, marginBottom: 8 },
  cartBarContainer: { position: "absolute", bottom: 40, left: 20, right: 20 },
  cartBar: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(74, 96, 56, 0.95)", borderRadius: 24, padding: 12, overflow: "hidden" },
  cartIconBox: { width: 48, height: 48, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 14, justifyContent: "center", alignItems: "center" },
  cartBadge: { position: "absolute", top: -5, right: -5, backgroundColor: "#FF8C42", width: 20, height: 20, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  cartBadgeText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  cartBarTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cartBarSub: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  checkoutBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#FF8C42", justifyContent: "center", alignItems: "center" },
  
  // Broadcast Styles
  broadcastInfoSection: { paddingHorizontal: 20, marginBottom: 30, gap: 12 },
  statusBanner: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#F0F2D9", padding: 16, borderRadius: 20, borderWidth: 1, borderColor: "rgba(74, 96, 56, 0.1)" },
  statusText: { flex: 1, fontSize: 14, color: "#4A6038", fontWeight: "600", fontStyle: "italic" },
  deliveryCard: { backgroundColor: "#fff", padding: 16, borderRadius: 20, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 10, elevation: 2, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  deliveryRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  deliveryLabel: { fontSize: 13, fontWeight: "600", color: "#8A998A" },
  deliveryValue: { fontSize: 14, fontWeight: "800", color: "#1E261E" },
  
  // New Location Styles
  storeLocationSection: { paddingHorizontal: 20, marginTop: 16, marginBottom: 20 },
  locationMainRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  locationMainText: { fontSize: 16, fontWeight: "700", color: "#1E261E" },
  addressRow: { marginTop: 4, paddingLeft: 26 },
  addressText: { fontSize: 13, color: "#8A998A", lineHeight: 18 },

  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: "#F5F6E9" },
  modalHeader: { width: "100%", height: 350 },
  modalHeroImage: { width: "100%", height: "100%" },
  modalCloseBtn: { position: "absolute", top: 20, right: 20, borderRadius: 25, overflow: "hidden" },
  modalCloseBlur: { width: 50, height: 50, justifyContent: "center", alignItems: "center" },
  modalContent: { padding: 24, marginTop: -30, backgroundColor: "#F5F6E9", borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  modalMainInfo: { flexDirection: "column", gap: 8, marginBottom: 16 },
  modalTitle: { fontSize: 32, fontWeight: "800", color: "#1E261E", fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  modalCategory: { fontSize: 13, color: "#8A998A", fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 },
  modalPrice: { fontSize: 24, fontWeight: "800", color: "#4A6038" },
  modalDescription: { fontSize: 16, color: "#4A524A", lineHeight: 26, marginBottom: 40 },
  modalMinimalInfo: { flexDirection: "row", gap: 12, marginBottom: 30 },
  modalInfoChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: "#E0E8D8" },
  modalInfoText: { fontSize: 12, fontWeight: "700", color: "#4A6038" },
  modalFooter: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20, backgroundColor: "rgba(255,255,255,0.85)" },
  modalPrimaryAddBtn: { backgroundColor: "#4A6038", height: 64, borderRadius: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", shadowColor: "#4A6038", shadowOpacity: 0.2, shadowRadius: 15, elevation: 8 },
  modalPrimaryAddText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  modalQtyActionRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  modalQtySelector: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", height: 64, borderRadius: 24, paddingHorizontal: 8, borderWidth: 1, borderColor: "#E0E8D8" },
  modalQtyBtn: { width: 48, height: 48, borderRadius: 18, backgroundColor: "#F5F6E9", justifyContent: "center", alignItems: "center" },
  modalQtyVal: { fontSize: 20, fontWeight: "800", color: "#1E261E" },
  modalDoneBtn: { backgroundColor: "#1E261E", height: 64, borderRadius: 24, paddingHorizontal: 30, justifyContent: "center", alignItems: "center" },
  modalDoneBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
