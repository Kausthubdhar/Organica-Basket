import { FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StatusBar as RNStatusBar,
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
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { supabase } from "../lib/supabase";

const { width, height } = Dimensions.get("window");
const OTP_LENGTH = 6;
const CARD_BORDER_RADIUS = 36;

export default function LoginScreen() {
  const router = useRouter();

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const otpRefs = useRef<(TextInput | null)[]>([]);
  const resendRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animation values
  const cardTranslateY = useSharedValue(60);
  const cardOpacity = useSharedValue(0);
  const heroScale = useSharedValue(1.08);
  const stepOpacity = useSharedValue(1);

  useEffect(() => {
    // Entrance animation
    cardTranslateY.value = withSpring(0, { damping: 22, stiffness: 100 });
    cardOpacity.value = withTiming(1, { duration: 600 });
    heroScale.value = withTiming(1, { duration: 1200 });
    return () => { if (resendRef.current) clearInterval(resendRef.current); };
  }, [cardOpacity, cardTranslateY, heroScale]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardTranslateY.value }],
    opacity: cardOpacity.value,
  }));

  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heroScale.value }],
  }));

  const startResendTimer = () => {
    setResendTimer(30);
    resendRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) { clearInterval(resendRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  const transitionStep = (nextStep: "email" | "otp") => {
    stepOpacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(setStep)(nextStep);
      stepOpacity.value = withTiming(1, { duration: 350 });
    });
  };

  const handleSendOtp = async () => {
    setError(null);
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error: supaError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });

    setIsSending(false);

    if (supaError) {
      setError(supaError.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    transitionStep("otp");
    startResendTimer();
    setTimeout(() => otpRefs.current[0]?.focus(), 500);
  };

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, "").slice(0, OTP_LENGTH);
      const filled = Array(OTP_LENGTH).fill("");
      for (let i = 0; i < pasted.length; i++) filled[i] = pasted[i];
      setOtp(filled);
      otpRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
      return;
    }
    newOtp[index] = value.replace(/\D/g, "");
    setOtp(newOtp);
    if (value && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < OTP_LENGTH) { setError(`Enter all ${OTP_LENGTH} digits.`); return; }

    setError(null);
    setIsVerifying(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { data, error: supaError } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code,
      type: "email",
    });

    setIsVerifying(false);

    if (supaError) {
      setError("Invalid or expired code. Try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_onboarded, role")
        .eq("id", data.user.id)
        .single();

      if (!profile?.is_onboarded) {
        router.replace("/onboarding-form");
      } else if (profile.role === "owner") {
        router.replace("/(owner)" as any);
      } else {
        router.replace("/(shopper)" as any);
      }
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setOtp(["", "", "", "", "", ""]);
    setError(null);
    await handleSendOtp();
  };

  const stepStyle = useAnimatedStyle(() => ({ opacity: stepOpacity.value }));
  const otpComplete = otp.join("").length === OTP_LENGTH;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* ── Hero Image Section ── */}
      <Animated.View style={[styles.heroWrapper, heroStyle]}>
        <Image
          source={require("../assets/images/farm_bg.png")}
          style={styles.heroImage}
          contentFit="cover"
        />
        <LinearGradient
          colors={["transparent", "rgba(22,40,22,0.55)", "rgba(15,28,15,0.85)"]}
          style={StyleSheet.absoluteFill}
          locations={[0.3, 0.65, 1]}
        />

        {/* Back button */}
        <Animated.View entering={FadeIn.duration(800).delay(300)} style={[styles.backBtn, { top: Platform.OS === "android" ? (RNStatusBar.currentHeight ?? 0) + 16 : 56 }]}>
          <TouchableOpacity
            onPress={() => {
              if (step === "otp") { transitionStep("email"); setOtp(["", "", "", "", "", ""]); setError(null); }
              else { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }
            }}
            style={styles.backIconBtn}
          >
            <Ionicons name={step === "otp" ? "arrow-back" : "close"} size={22} color="#fff" />
          </TouchableOpacity>
        </Animated.View>

        {/* Branding on hero */}
        <Animated.View entering={FadeInDown.duration(900).delay(200)} style={styles.heroBranding}>
          <View style={styles.logoRow}>
            <View style={styles.logoIconCircle}>
              <FontAwesome5 name="seedling" size={18} color="#fff" />
            </View>
            <Text style={styles.logoText}>Organica Bucket</Text>
          </View>
          <Text style={styles.heroTagline}>Soil to Soul.</Text>
          <Text style={styles.heroSubTagline}>
            Fresh organic harvest, delivered to your door.
          </Text>
        </Animated.View>
      </Animated.View>

      {/* ── Bottom Sheet Card ── */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Animated.View style={[styles.card, cardStyle]}>
            {/* Pull handle */}
            <View style={styles.pullHandle} />

            <Animated.View style={stepStyle}>
              {step === "email" ? (
                /* ── EMAIL STEP ── */
                <View>
                  <Text style={styles.cardTitle}>Continue with Email</Text>
                  <Text style={styles.cardSubtitle}>
                    New or returning — just enter your email.{"\n"}We&apos;ll send a quick verification code.
                  </Text>

                  {/* Email Input */}
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputContainer}>
                      <Ionicons name="mail-outline" size={20} color="#4A6038" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="yourname@email.com"
                        placeholderTextColor="#B0BDB0"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="email"
                        value={email}
                        onChangeText={(t) => { setEmail(t); setError(null); }}
                        onSubmitEditing={handleSendOtp}
                        returnKeyType="send"
                      />
                      {isValidEmail(email) && (
                        <Animated.View entering={FadeIn.duration(200)}>
                          <Ionicons name="checkmark-circle" size={20} color="#4A6038" />
                        </Animated.View>
                      )}
                    </View>
                  </View>

                  {/* Error */}
                  {error && (
                    <Animated.View entering={FadeIn.duration(300)} style={styles.errorBox}>
                      <Ionicons name="alert-circle-outline" size={15} color="#C0392B" />
                      <Text style={styles.errorText}>{error}</Text>
                    </Animated.View>
                  )}

                  {/* CTA */}
                  <TouchableOpacity
                    style={[styles.primaryBtn, (!isValidEmail(email) || isSending) && styles.primaryBtnDisabled]}
                    onPress={handleSendOtp}
                    activeOpacity={0.85}
                    disabled={!isValidEmail(email) || isSending}
                  >
                    {isSending ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Text style={styles.primaryBtnText}>Send Verification Code</Text>
                        <View style={styles.btnArrow}>
                          <Ionicons name="arrow-forward" size={16} color="#4A6038" />
                        </View>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Divider + Trust strip */}
                  <View style={styles.trustRow}>
                    <View style={styles.trustItem}>
                      <Ionicons name="shield-checkmark-outline" size={13} color="#8A998A" />
                      <Text style={styles.trustText}>No password</Text>
                    </View>
                    <View style={styles.trustDot} />
                    <View style={styles.trustItem}>
                      <Ionicons name="lock-closed-outline" size={13} color="#8A998A" />
                      <Text style={styles.trustText}>100% Secure</Text>
                    </View>
                    <View style={styles.trustDot} />
                    <View style={styles.trustItem}>
                      <MaterialCommunityIcons name="leaf" size={13} color="#8A998A" />
                      <Text style={styles.trustText}>Organica</Text>
                    </View>
                  </View>
                </View>
              ) : (
                /* ── OTP STEP ── */
                <View>
                  {/* Email chip */}
                  <View style={styles.emailChip}>
                    <Ionicons name="mail" size={14} color="#4A6038" />
                    <Text style={styles.emailChipText} numberOfLines={1}>
                      {email.toLowerCase()}
                    </Text>
                  </View>

                  <Text style={styles.cardTitle}>Enter the Code</Text>
                  <Text style={styles.cardSubtitle}>
                    We&apos;ve sent a 6-digit code to your email.{"\n"}It expires in 10 minutes.
                  </Text>

                  {/* OTP Boxes */}
                  <View style={styles.otpRow}>
                    {otp.map((digit, i) => (
                      <TextInput
                        key={i}
                        ref={(r) => { otpRefs.current[i] = r; }}
                        style={[styles.otpBox, digit ? styles.otpBoxActive : null]}
                        value={digit}
                        onChangeText={(v) => handleOtpChange(v, i)}
                        onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                        keyboardType="number-pad"
                        maxLength={6}
                        textAlign="center"
                        selectTextOnFocus
                        caretHidden
                      />
                    ))}
                  </View>

                  {/* Error */}
                  {error && (
                    <Animated.View entering={FadeIn.duration(300)} style={styles.errorBox}>
                      <Ionicons name="alert-circle-outline" size={15} color="#C0392B" />
                      <Text style={styles.errorText}>{error}</Text>
                    </Animated.View>
                  )}

                  {/* Verify CTA */}
                  <TouchableOpacity
                    style={[styles.primaryBtn, (!otpComplete || isVerifying) && styles.primaryBtnDisabled]}
                    onPress={handleVerify}
                    activeOpacity={0.85}
                    disabled={!otpComplete || isVerifying}
                  >
                    {isVerifying ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Text style={styles.primaryBtnText}>Verify & Continue</Text>
                        <View style={styles.btnArrow}>
                          <Ionicons name="checkmark" size={16} color="#4A6038" />
                        </View>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Resend */}
                  <TouchableOpacity
                    onPress={handleResend}
                    disabled={resendTimer > 0}
                    style={styles.resendRow}
                  >
                    <Text style={styles.resendText}>
                      Didn&apos;t get it?{"  "}
                      {resendTimer > 0 ? (
                        <Text style={styles.resendTimerText}>
                          Resend in {resendTimer}s
                        </Text>
                      ) : (
                        <Text style={styles.resendLink}>Resend Code</Text>
                      )}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>
          </Animated.View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F1C0F",
  },

  // ── Hero ──
  heroWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.58,
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  backBtn: {
    position: "absolute",
    left: 20,
  },
  backIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  heroBranding: {
    position: "absolute",
    bottom: 32,
    left: 28,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  logoIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
  },
  logoText: {
    fontSize: 17,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
    letterSpacing: 0.3,
  },
  heroTagline: {
    fontSize: 42,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -1,
    lineHeight: 46,
    marginBottom: 8,
  },
  heroSubTagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.72)",
    fontWeight: "400",
    lineHeight: 20,
  },

  // ── Card ──
  keyboardView: {
    flex: 1,
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: CARD_BORDER_RADIUS,
    borderTopRightRadius: CARD_BORDER_RADIUS,
    paddingHorizontal: 28,
    paddingBottom: Platform.OS === "ios" ? 40 : 32,
    paddingTop: 20,
    minHeight: height * 0.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 20,
  },
  pullHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0E8D8",
    alignSelf: "center",
    marginBottom: 24,
  },

  // Email chip (shown on OTP step)
  emailChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0F4EC",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: "flex-start",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(74,96,56,0.15)",
  },
  emailChipText: {
    fontSize: 13,
    color: "#4A6038",
    fontWeight: "600",
    maxWidth: width - 120,
  },

  cardTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1E261E",
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#6B7A6B",
    lineHeight: 22,
    marginBottom: 28,
  },

  // Input
  inputWrapper: {
    marginBottom: 14,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F5E6",
    borderRadius: 18,
    paddingHorizontal: 18,
    height: 58,
    borderWidth: 1.5,
    borderColor: "rgba(74,96,56,0.12)",
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: "#1E261E",
    fontWeight: "500",
  },

  // Error
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(192,57,43,0.07)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(192,57,43,0.18)",
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: "#C0392B",
    fontWeight: "500",
  },

  // Primary Button
  primaryBtn: {
    backgroundColor: "#2D4A2D",
    borderRadius: 20,
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 20,
    shadowColor: "#2D4A2D",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryBtnDisabled: {
    backgroundColor: "#B8C4B0",
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  btnArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Trust row
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trustText: {
    fontSize: 11,
    color: "#8A998A",
    fontWeight: "600",
  },
  trustDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#C8D4C0",
  },

  // OTP
  otpRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginBottom: 20,
  },
  otpBox: {
    flex: 1,
    height: 58,
    maxWidth: 50,
    borderRadius: 16,
    backgroundColor: "#F4F5E6",
    fontSize: 24,
    fontWeight: "800",
    color: "#1E261E",
    borderWidth: 2,
    borderColor: "transparent",
    textAlign: "center",
  },
  otpBoxActive: {
    borderColor: "#4A6038",
    backgroundColor: "#F0F6EC",
  },

  // Resend
  resendRow: {
    alignItems: "center",
  },
  resendText: {
    fontSize: 13,
    color: "#6B7A6B",
    textAlign: "center",
  },
  resendLink: {
    color: "#4A6038",
    fontWeight: "700",
  },
  resendTimerText: {
    color: "#A8B8A0",
    fontWeight: "600",
  },
});
