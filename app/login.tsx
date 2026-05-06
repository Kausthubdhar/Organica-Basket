import {
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StatusBar as RNStatusBar,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

export default function LoginScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [activeTab, setActiveTab] = useState("signin");

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log("Continue with:", phoneNumber, fullName);
  };

  const handleGoogleLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log("Google Login pressed");
  };

  const toggleTab = (tab: string) => {
    Haptics.selectionAsync();
    setActiveTab(tab);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <Image
        source={require("../assets/images/farm_bg.png")}
        style={styles.backgroundImage}
        contentFit="cover"
        blurRadius={50}
      />
      <View style={styles.backgroundOverlay} />

      <SafeAreaView style={styles.safeArea}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            <Animated.View
              entering={FadeInUp.duration(600)}
              style={styles.header}
            >
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={28} color="#3E5C40" />
              </TouchableOpacity>
              <View style={styles.logoContainer}>
                <FontAwesome5 name="seedling" size={20} color="#3E5C40" />
                <Text style={styles.logoText}>Organica Bucket </Text>
              </View>
              <View style={{ width: 28 }} />
            </Animated.View>

            <View style={styles.content}>
              <Animated.View
                entering={FadeInDown.duration(800).delay(200)}
                layout={LinearTransition.springify().damping(22).stiffness(90)}
                style={styles.card}
              >
                {activeTab === "signin" ? (
                  <Animated.View
                    key="signin-view"
                    entering={FadeIn.duration(400)}
                    exiting={FadeOut.duration(200)}
                    style={styles.formContainer}
                  >
                    <Text style={styles.title}>Welcome back</Text>
                    <Text style={styles.subtitle}>
                      Join our organic movement from soil to soul.
                    </Text>

                    <View style={styles.inputSection}>
                      <Text style={styles.inputLabel}>PHONE NUMBER</Text>
                      <View style={styles.phoneInputContainer}>
                        <TouchableOpacity
                          style={styles.countryCodeSelector}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.flag}>🇮🇳</Text>
                          <Text style={styles.countryCodeText}>+91</Text>
                          <Ionicons
                            name="chevron-down"
                            size={14}
                            color="#3E5C40"
                            style={styles.chevron}
                          />
                        </TouchableOpacity>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Enter your number"
                          placeholderTextColor="#9AA69A"
                          keyboardType="phone-pad"
                          value={phoneNumber}
                          onChangeText={setPhoneNumber}
                          maxLength={10}
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.primaryButton}
                      activeOpacity={0.8}
                      onPress={handleContinue}
                    >
                      <Text style={styles.primaryButtonText}>Continue</Text>
                    </TouchableOpacity>

                    <View style={styles.dividerContainer}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>OR</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    <TouchableOpacity
                      style={styles.googleButton}
                      activeOpacity={0.8}
                      onPress={handleGoogleLogin}
                    >
                      <Image
                        source={{
                          uri: "https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg",
                        }}
                        style={styles.googleIcon}
                        contentFit="contain"
                      />
                      <Text style={styles.googleButtonText}>
                        Continue with Google
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.signupContainer}>
                      <Text style={styles.signupText}>
                        Don't have an account?{" "}
                      </Text>
                      <TouchableOpacity onPress={() => toggleTab("join")}>
                        <Text style={styles.signupLink}>Sign up</Text>
                      </TouchableOpacity>
                    </View>
                  </Animated.View>
                ) : (
                  <Animated.View
                    key="join-view"
                    entering={FadeIn.duration(400)}
                    exiting={FadeOut.duration(200)}
                    style={styles.formContainer}
                  >
                    <Text style={styles.title}>Start Your Journey</Text>
                    <Text style={styles.subtitle}>
                      Fresh, organic harvest delivered straight to your door.
                    </Text>

                    <View style={styles.inputSection}>
                      <Text style={styles.inputLabel}>FULL NAME</Text>
                      <View style={styles.fullNameInputContainer}>
                        <Ionicons
                          name="person-outline"
                          size={18}
                          color="#4A6038"
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={styles.fullNameTextInput}
                          placeholder="Enter your full name"
                          placeholderTextColor="#9AA69A"
                          value={fullName}
                          onChangeText={setFullName}
                        />
                      </View>
                    </View>

                    <View style={[styles.inputSection, { marginTop: 4 }]}>
                      <Text style={styles.inputLabel}>PHONE NUMBER</Text>
                      <View style={styles.phoneInputContainer}>
                        <TouchableOpacity
                          style={styles.countryCodeSelector}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.flag}>🇮🇳</Text>
                          <Text style={styles.countryCodeText}>+91</Text>
                          <Ionicons
                            name="chevron-down"
                            size={14}
                            color="#3E5C40"
                            style={styles.chevron}
                          />
                        </TouchableOpacity>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Enter your number"
                          placeholderTextColor="#9AA69A"
                          keyboardType="phone-pad"
                          value={phoneNumber}
                          onChangeText={setPhoneNumber}
                          maxLength={10}
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.primaryButton}
                      activeOpacity={0.8}
                      onPress={handleContinue}
                    >
                      <Text style={styles.primaryButtonText}>
                        Create Account
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.dividerContainer}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>OR</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    <TouchableOpacity
                      style={styles.googleButton}
                      activeOpacity={0.8}
                      onPress={handleGoogleLogin}
                    >
                      <Image
                        source={{
                          uri: "https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg",
                        }}
                        style={styles.googleIcon}
                        contentFit="contain"
                      />
                      <Text style={styles.googleButtonText}>
                        Sign up with Google
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.signupContainer}>
                      <Text style={styles.signupText}>
                        Already have an account?{" "}
                      </Text>
                      <TouchableOpacity onPress={() => toggleTab("signin")}>
                        <Text style={styles.signupLink}>Sign in</Text>
                      </TouchableOpacity>
                    </View>
                  </Animated.View>
                )}
              </Animated.View>

              <Animated.View
                entering={FadeInDown.duration(800).delay(400)}
                style={styles.badgesContainer}
              >
                <View style={styles.badge}>
                  <MaterialCommunityIcons
                    name="leaf-circle"
                    size={16}
                    color="#C98B4B"
                  />
                  <Text style={styles.badgeText}>100% ORGANIC</Text>
                </View>
                <View style={styles.badge}>
                  <MaterialCommunityIcons
                    name="truck-fast"
                    size={16}
                    color="#C98B4B"
                  />
                  <Text style={styles.badgeText}>FARM TO DOOR</Text>
                </View>
              </Animated.View>
            </View>

            <Animated.View
              entering={FadeInUp.duration(800).delay(600)}
              style={styles.bottomNavContainer}
            >
              <View style={styles.bottomNav}>
                <TouchableOpacity
                  style={[
                    styles.navItem,
                    activeTab === "signin" && styles.navItemActive,
                  ]}
                  onPress={() => toggleTab("signin")}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={activeTab === "signin" ? "log-in" : "log-in-outline"}
                    size={24}
                    color={activeTab === "signin" ? "#3E5C40" : "#8A998A"}
                  />
                  <Text
                    style={[
                      styles.navText,
                      activeTab === "signin" && styles.navTextActive,
                    ]}
                  >
                    SIGN IN
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.navItem,
                    activeTab === "join" && styles.navItemActive,
                  ]}
                  onPress={() => toggleTab("join")}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={
                      activeTab === "join" ? "person-add" : "person-add-outline"
                    }
                    size={24}
                    color={activeTab === "join" ? "#3E5C40" : "#8A998A"}
                  />
                  <Text
                    style={[
                      styles.navText,
                      activeTab === "join" && styles.navTextActive,
                    ]}
                  >
                    JOIN
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F6E9",
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(245, 246, 233, 0.8)",
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight : 0,
  },
  keyboardView: {
    flex: 1,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  closeButton: {
    padding: 4,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#3E5C40",
    fontStyle: "italic",
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 8,
    alignItems: "center",
    overflow: "hidden", // needed for Layout.springify
  },
  formContainer: {
    width: "100%",
    alignItems: "center",
  },
  title: {
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontSize: 32,
    fontWeight: "bold",
    color: "#1E261E",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7A6B",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  inputSection: {
    width: "100%",
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4A6038",
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 4,
  },
  phoneInputContainer: {
    flexDirection: "row",
    gap: 12,
  },
  countryCodeSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F5E6",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 6,
  },
  flag: {
    fontSize: 16,
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E261E",
  },
  chevron: {
    marginLeft: 2,
  },
  textInput: {
    flex: 1,
    backgroundColor: "#F4F5E6",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 0,
    height: 50,
    fontSize: 14,
    fontWeight: "500",
    color: "#1E261E",
  },
  fullNameInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F5E6",
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  fullNameTextInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 14,
    fontWeight: "500",
    color: "#1E261E",
  },
  primaryButton: {
    backgroundColor: "#4A6038",
    width: "100%",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 24,
    marginTop: 4,
    shadowColor: "#4A6038",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E5D8",
  },
  dividerText: {
    color: "#8A998A",
    paddingHorizontal: 16,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F5E6",
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  googleButtonText: {
    color: "#3E5C40",
    fontSize: 16,
    fontWeight: "600",
  },
  signupContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  signupText: {
    color: "#6B7A6B",
    fontSize: 14,
  },
  signupLink: {
    color: "#4A6038",
    fontSize: 14,
    fontWeight: "bold",
  },
  badgesContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginTop: 24,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badgeText: {
    color: "#6B7A6B",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  bottomNavContainer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 10 : 24,
  },
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    padding: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  navItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  navItemActive: {
    backgroundColor: "#F4F5E6",
  },
  navText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8A998A",
    letterSpacing: 1,
  },
  navTextActive: {
    color: "#3E5C40",
  },
});
