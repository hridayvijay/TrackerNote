import React, { useState, useEffect } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, getMessagingInstance } from "./firebase";
import { getToken, onMessage } from "firebase/messaging";
import firebaseConfig from "../firebase-applet-config.json";
import NotesDashboard from "./components/NotesDashboard";
import AccountPage from "./components/AccountPage";
import {
  checkUsernameAvailable,
  saveUsername,
  getUserProfile,
  UserProfile,
  saveFcmToken,
} from "./services";
import {
  Briefcase,
  LogOut,
  Moon,
  Sun,
  Settings,
  Chrome,
  Mail,
  Lock,
  User as UserIcon,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  AlertCircle,
  Palette
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { ThemeProvider, useTheme } from "./themes/ThemeContext";
import ThemePicker from "./components/ThemePicker";

export default function AppWrapper() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const { mode, toggleMode } = useTheme();
  const isDarkMode = mode === "dark";
  const isPlaceholderFirebase = firebaseConfig.apiKey === "remixed-api-key" || firebaseConfig.projectId === "remixed-project-id";

  // App navigation state
  const [showAccountPage, setShowAccountPage] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);

  // Profile status for logged-in user
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [needsUsernameChoice, setNeedsUsernameChoice] = useState(false);
  const [chosenGoogleUsername, setChosenGoogleUsername] = useState("");
  const [checkingGoogleUsername, setCheckingGoogleUsername] = useState(false);
  const [googleUsernameAvailable, setGoogleUsernameAvailable] = useState<boolean | null>(null);
  const [googleUsernameError, setGoogleUsernameError] = useState("");
  const [savingGoogleUsername, setSavingGoogleUsername] = useState(false);
  const [googleSetupStep, setGoogleSetupStep] = useState<1 | 2>(1);
  const [googleDisplayName, setGoogleDisplayName] = useState("");
  const [googleSuggestedUsername, setGoogleSuggestedUsername] = useState("");

  // Auth / Form states (when !user)
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [authError, setAuthError] = useState("");
  const [submittingAuth, setSubmittingAuth] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetError, setResetError] = useState("");

  const handleForgotPassword = async () => {
    setAuthError("");
    setResetError("");
    setResetEmailSent(false);

    if (!email) {
      setResetError("Please enter your email address first.");
      return;
    }

    try {
      setSubmittingAuth(true);
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
    } catch (error: any) {
      console.error("Password reset error", error);
      if (error.code === 'auth/user-not-found') {
        setResetError("No user found with this email address.");
      } else if (error.code === 'auth/invalid-email') {
        setResetError("Please enter a valid email address.");
      } else {
        setResetError("Failed to send reset email. Please try again.");
      }
    } finally {
      setSubmittingAuth(false);
    }
  };

  // Real-time username verification during registration sign-up
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  // Removed local storage dark mode check

  // Handle Auth Changes and retrieve profile mapping
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setCheckingProfile(true);
        try {
          const prof = await getUserProfile(u.uid);
          setUserProfile(prof);
          if (!prof) {
            // User authenticated but has no Firestore profile map yet (e.g., first Google login)
            setNeedsUsernameChoice(true);
          } else {
            setNeedsUsernameChoice(false);
          }
        } catch (err) {
          console.error("Error retrieving user profile map", err);
        } finally {
          setCheckingProfile(false);
        }
      } else {
        setUserProfile(null);
        setNeedsUsernameChoice(false);
        setShowAccountPage(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (user) {
      const setupFCM = async () => {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const msg = await getMessagingInstance();
            if (msg) {
              const token = await getToken(msg);
              if (token) {
                await saveFcmToken(user.uid, token);
              }
              onMessage(msg, (payload) => {
                console.log('Message received. ', payload);
                const notificationTitle = payload.data?.title || payload.notification?.title || 'Reminder';
                const notificationOptions = {
                  body: payload.data?.body || payload.notification?.body || '',
                  icon: '/vite.svg'
                };
                new Notification(notificationTitle, notificationOptions);
              });
            }
          }
        } catch (error) {
          console.error("FCM Setup Error:", error);
        }
      };
      setupFCM();
    }
  }, [user]);

  // Debounced real-time username checker for Sign up form
  useEffect(() => {
    if (username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const isAvail = await checkUsernameAvailable(username);
        setUsernameAvailable(isAvail);
      } catch (err) {
        setUsernameAvailable(false);
      } finally {
        setCheckingUsername(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [username]);

  // Debounced real-time username checker for Google seamless onboarding modal
  useEffect(() => {
    if (chosenGoogleUsername.length < 3) {
      setGoogleUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingGoogleUsername(true);
      try {
        const isAvail = await checkUsernameAvailable(chosenGoogleUsername);
        setGoogleUsernameAvailable(isAvail);
      } catch (err) {
        setGoogleUsernameAvailable(false);
      } finally {
        setCheckingGoogleUsername(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [chosenGoogleUsername]);

  // Handle standard signing in / up with Email/Password
  const handleSubmitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (!email || !password || (isSignUp && !username)) {
      setAuthError("Please fill out all fields.");
      return;
    }

    if (isSignUp && username.length < 3) {
      setAuthError("Username must be at least 3 characters.");
      return;
    }

    if (isSignUp && !usernameAvailable) {
      setAuthError("Username is taken or unavailable.");
      return;
    }

    setSubmittingAuth(true);
    try {
      if (isSignUp) {
        // 1. Create firebase auth credentials
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        
        // 2. Lock username in Firestore database under uid
        await saveUsername(cred.user.uid, username, email, username);

        // 3. Update auth display name
        await updateProfile(cred.user, { displayName: username });

        // Retrieve newly created profile mapping
        const prof = await getUserProfile(cred.user.uid);
        setUserProfile(prof);
      } else {
        // Simple manual login
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error("Authentication action failed", error);
      if (error.code === "auth/email-already-in-use") {
        setAuthError("This email address is already in use.");
      } else if (error.code === "auth/invalid-credential") {
        setAuthError("Incorrect password or username. Please check details.");
      } else {
        setAuthError(error.message || "An authentication error occurred.");
      }
    } finally {
      setSubmittingAuth(false);
    }
  };

  // Google Login handling
  const handleGoogleLogin = async () => {
    setAuthError("");
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        // User intentionally closed the popup, don't treat it as a failure
        return;
      }
      console.error("Google authentication error", error);
      setAuthError("Google Sign-in failed. Please ensure you are not inside an iframe block or try pop-out window.");
    }
  };

  // Confirm Google username creation on first sign-in
  const handleSaveGoogleUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleUsernameError("");

    if (!user) return;
    if (chosenGoogleUsername.length < 3) {
      setGoogleUsernameError("Username must be at least 3 chars.");
      return;
    }

    if (!googleUsernameAvailable) {
      setGoogleUsernameError("This username is already taken.");
      return;
    }

    setSavingGoogleUsername(true);
    try {
      await saveUsername(user.uid, chosenGoogleUsername, user.email || "", googleDisplayName);
      await updateProfile(user, { displayName: googleDisplayName });
      
      const prof = await getUserProfile(user.uid);
      setUserProfile(prof);
      setNeedsUsernameChoice(false);
    } catch (err: any) {
      console.error(err);
      setGoogleUsernameError(err.message || "Failed to commit your profile.");
    } finally {
      setSavingGoogleUsername(false);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  // Sanitize username typing structure
  const handleUsernameChangeRaw = (val: string) => {
    const cleaned = val.replace(/[^a-zA-Z0-9_\-]/g, "").substring(0, 30);
    setUsername(cleaned);
  };

  const handleGoogleUsernameChangeRaw = (val: string) => {
    const cleaned = val.replace(/[^a-zA-Z0-9_\-]/g, "").substring(0, 30);
    setChosenGoogleUsername(cleaned);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[var(--theme-bg-primary)] dark:bg-[var(--theme-bg-primary)]">
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--theme-accent)]/30 dark:bg-[var(--theme-accent)]/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="animate-pulse flex items-center space-x-2 text-[var(--theme-accent-text)] z-10 relative">
          <Briefcase className="w-5 h-5" />
          <span className="font-semibold text-lg text-[var(--theme-text-primary)] text-[var(--theme-text-primary)]">
            Loading TrackerNote...
          </span>
        </div>
      </div>
    );
  }

  // Render Login and Signup options when not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[var(--theme-bg-primary)] transition-colors duration-300">
        
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[var(--theme-accent)]/40 dark:bg-[var(--theme-accent)]/15 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-300/40 dark:bg-cyan-600/15 rounded-full blur-[100px]" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="glass-panel max-w-lg w-full rounded-2xl overflow-hidden relative z-10 transition-all duration-300 border border-[var(--theme-border)]/50 border-[var(--theme-border)]/60 shadow-2xl"
        >
          <div className="p-8 space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-14 h-14 bg-[var(--theme-accent)]/10 dark:bg-[var(--theme-accent)]/20 rounded-full flex items-center justify-center">
                <Briefcase className="w-7 h-7 text-[var(--theme-accent-text)] text-[var(--theme-accent-text)]" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-[var(--theme-text-primary)] text-[var(--theme-text-primary)]">
                TrackerNote
              </h1>
              <p className="text-[var(--theme-text-secondary)] text-[var(--theme-text-secondary)] text-sm max-w-sm">
                Securely sync stakeholder notes, board priorities, and custom reminders inside a unified dashboard.
              </p>
            </div>

            {/* Selector Tab Option */}
            <div className="flex bg-[var(--theme-bg-secondary)] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setAuthError("");
                }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                  !isSignUp
                    ? "bg-[var(--theme-bg-card)] text-[var(--theme-text-primary)] shadow text-[var(--theme-text-primary)]"
                    : "text-[var(--theme-text-secondary)] hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setAuthError("");
                }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                  isSignUp
                    ? "bg-[var(--theme-bg-card)] text-[var(--theme-text-primary)] shadow text-[var(--theme-text-primary)]"
                    : "text-[var(--theme-text-secondary)] hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmitAuth} className="space-y-4">
              {isSignUp && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Username</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[var(--theme-text-muted)]" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => handleUsernameChangeRaw(e.target.value)}
                      placeholder="Type letters, numbers or dashes"
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-[var(--theme-border)] border-[var(--theme-border)] bg-[var(--theme-bg-card)] dark:bg-[var(--theme-bg-primary)]/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                      required
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                      {checkingUsername && <RefreshCw className="w-4 h-4 text-[var(--theme-accent-text)] animate-spin" />}
                      {!checkingUsername && usernameAvailable === true && <CheckCircle2 className="w-4 h-4 text-[var(--theme-accent-text)]" />}
                      {!checkingUsername && usernameAvailable === false && <XCircle className="w-4 h-4 text-red-500" />}
                    </div>
                  </div>
                  {usernameAvailable === true && (
                    <p className="text-[11px] text-[var(--theme-accent-text)] font-bold">✨ Available and secure</p>
                  )}
                  {usernameAvailable === false && (
                    <p className="text-[11px] text-red-500 font-bold">❌ This username is already taken</p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[var(--theme-text-muted)]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--theme-border)] border-[var(--theme-border)] bg-[var(--theme-bg-card)] dark:bg-[var(--theme-bg-primary)]/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[var(--theme-text-muted)]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--theme-border)] border-[var(--theme-border)] bg-[var(--theme-bg-card)] dark:bg-[var(--theme-bg-primary)]/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                    required
                  />
                </div>
              </div>

              {authError && (
                <div className="bg-red-500/10 border border-red-500/25 p-3 rounded-xl text-xs text-red-600 dark:text-red-400 font-bold">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={submittingAuth || (isSignUp && usernameAvailable === false)}
                className="w-full font-bold text-sm bg-[var(--theme-accent)] text-[var(--theme-text-primary)] rounded-xl py-3 flex items-center justify-center space-x-1.5 hover:bg-[var(--theme-accent)] active:scale-95 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{submittingAuth ? "Please wait..." : isSignUp ? "Create Account" : "Access TrackerNote"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {!isSignUp && (
              <div className="text-center mt-3 space-y-2">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-medium text-[var(--theme-accent-text)] hover:text-[var(--theme-accent-text)] dark:hover:text-indigo-400"
                >
                  Forgot Password?
                </button>
                {resetEmailSent && (
                  <div className="text-xs text-[var(--theme-accent-text)] dark:text-[var(--theme-accent-text)] bg-emerald-50 border border-emerald-500/20 p-2 rounded-lg">
                    Password reset email sent! Check your inbox.
                  </div>
                )}
                {resetError && (
                  <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-500/20 p-2 rounded-lg">
                    {resetError}
                  </div>
                )}
              </div>
            )}

            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--theme-border)] border-[var(--theme-border)]" />
              </div>
              <span className="relative bg-[var(--theme-bg-primary)] px-4 text-xs font-bold uppercase tracking-wider text-[var(--theme-text-muted)] select-none">
                or sign in with
              </span>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="w-full border border-slate-250 border-[var(--theme-border)] bg-[var(--theme-bg-card)] hover:bg-[var(--theme-bg-card)] dark:bg-[var(--theme-bg-primary)]/30 dark:hover:bg-[var(--theme-bg-primary)]/50 py-3 rounded-xl flex items-center justify-center text-sm font-semibold text-[var(--theme-text-primary)] text-[var(--theme-text-primary)] transition-all select-none hover:shadow-sm"
            >
              <Chrome className="w-4 h-4 mr-2" />
              Google Provider
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Render Google username choosing overlay first if profile was not mapped
  if (needsUsernameChoice) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[var(--theme-bg-primary)] transition-colors duration-300">
        
        <div className="relative z-10 w-full max-w-md overflow-hidden">
          <AnimatePresence mode="wait">
            {googleSetupStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="glass-panel w-full rounded-2xl p-8 border border-[var(--theme-border)] border-[var(--theme-border)] shadow-2xl"
              >
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <h2 className="text-3xl font-black text-[var(--theme-text-primary)] text-[var(--theme-text-primary)] tracking-tight">What is your name?</h2>
                    <p className="text-sm text-[var(--theme-text-secondary)] text-[var(--theme-text-secondary)]">
                      (This is how we'll refer to you — and how others will see you)
                    </p>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (googleDisplayName.length >= 2 && googleDisplayName.length <= 40) {
                        const cleanBase = googleDisplayName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
                        setGoogleSuggestedUsername(`${cleanBase || "user"}_${Math.floor(100 + Math.random() * 900)}`);
                        setGoogleSetupStep(2);
                      }
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <input
                        type="text"
                        value={googleDisplayName}
                        onChange={(e) => setGoogleDisplayName(e.target.value)}
                        placeholder="Your display name"
                        className="w-full px-4 py-4 rounded-xl border border-[var(--theme-border)] border-[var(--theme-border)] bg-[var(--theme-bg-card)] dark:bg-[var(--theme-bg-primary)]/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg font-medium text-center"
                        minLength={2}
                        maxLength={40}
                        required
                        autoFocus
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={googleDisplayName.length < 2 || googleDisplayName.length > 40}
                      className="w-full font-bold text-base bg-[var(--theme-accent)] hover:bg-[var(--theme-accent)] text-[var(--theme-text-primary)] py-4 rounded-xl shadow-lg transition-all disabled:opacity-50"
                    >
                      Continue
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {googleSetupStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="glass-panel w-full rounded-2xl p-8 border border-[var(--theme-border)] border-[var(--theme-border)] shadow-2xl"
              >
                <div className="space-y-6">
                  <div className="relative text-center space-y-2">
                    <button
                      type="button"
                      onClick={() => setGoogleSetupStep(1)}
                      className="absolute left-0 top-0 p-2 text-[var(--theme-text-muted)] hover:text-[var(--theme-text-secondary)] dark:hover:text-slate-200"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="mx-auto w-12 h-12 bg-[var(--theme-accent)] dark:bg-[var(--theme-accent)]/40 rounded-full flex items-center justify-center text-[var(--theme-accent-text)]">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-black text-[var(--theme-text-primary)] text-[var(--theme-text-primary)]">Choose Username</h2>
                    <p className="text-xs text-[var(--theme-text-secondary)] text-[var(--theme-text-secondary)]">Please choose a unique identifier.</p>
                  </div>

                  <form onSubmit={handleSaveGoogleUsername} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Username Profile</label>
                      <div className="relative">
                        <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--theme-text-muted)]" />
                        <input
                          type="text"
                          value={chosenGoogleUsername}
                          onChange={(e) => handleGoogleUsernameChangeRaw(e.target.value)}
                          placeholder="Enter alphanumeric username"
                          className="w-full pl-10 pr-10 py-3 rounded-xl border border-[var(--theme-border)] border-[var(--theme-border)] bg-[var(--theme-bg-card)] dark:bg-[var(--theme-bg-primary)]/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                          required
                        />
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                          {checkingGoogleUsername && <RefreshCw className="w-4 h-4 text-[var(--theme-accent-text)] animate-spin" />}
                          {!checkingGoogleUsername && googleUsernameAvailable === true && <CheckCircle2 className="w-4 h-4 text-[var(--theme-accent-text)]" />}
                          {!checkingGoogleUsername && googleUsernameAvailable === false && <XCircle className="w-4 h-4 text-red-500" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-[var(--theme-text-secondary)] text-[var(--theme-text-secondary)] mt-1">
                        Usernames must be unique. <span className="italic opacity-70">Try: {googleSuggestedUsername}</span>
                      </p>
                      {googleUsernameAvailable === true && (
                        <p className="text-[11px] text-[var(--theme-accent-text)] font-bold mt-1">✨ Username is available</p>
                      )}
                      {googleUsernameAvailable === false && (
                        <p className="text-[11px] text-red-500 font-bold mt-1">❌ This username is already taken</p>
                      )}
                    </div>

                    {googleUsernameError && (
                      <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/20 text-xs font-medium text-red-600">
                        {googleUsernameError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={savingGoogleUsername || !googleUsernameAvailable}
                      className="w-full font-bold text-sm bg-[var(--theme-accent)] hover:bg-[var(--theme-accent)] text-[var(--theme-text-primary)] py-3 rounded-xl shadow-lg transition-all disabled:opacity-50"
                    >
                      {savingGoogleUsername ? "Saving Profile..." : "Finish setup"}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Base Dashboard layout with account navigation
  return (
    <div className="min-h-screen flex flex-col font-sans relative overflow-x-clip bg-[var(--theme-bg-primary)] transition-colors duration-300 text-[var(--theme-text-primary)] text-[var(--theme-text-primary)]">
      
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none z-0" style={{ background: 'var(--theme-orb-1)', opacity: 0.15 }} />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none z-0" style={{ background: 'var(--theme-orb-2)', opacity: 0.15 }} />
      

      <header className="glass flex-shrink-0 relative z-10 border-b border-[var(--theme-border)] border-[var(--theme-border)]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setShowAccountPage(false)}>
            <svg width="26" height="26" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="vg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--theme-orb-1)"/>
                  <stop offset="50%" stopColor="var(--theme-orb-2)"/>
                  <stop offset="100%" stopColor="var(--theme-orb-3)"/>
                </linearGradient>
                <radialGradient id="vs" cx="32%" cy="24%" r="58%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.2)"/>
                  <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
                </radialGradient>
              </defs>
              <circle cx="100" cy="100" r="100" fill="url(#vg)"/>
              <circle cx="100" cy="100" r="100" fill="url(#vs)"/>
              <line x1="25" y1="62" x2="131" y2="62" stroke="white" strokeWidth="14" strokeLinecap="round"/>
              <line x1="78" y1="62" x2="78" y2="152" stroke="white" strokeWidth="14" strokeLinecap="round"/>
              <line x1="131" y1="62" x2="131" y2="152" stroke="white" strokeWidth="14" strokeLinecap="round"/>
              <line x1="131" y1="62" x2="172" y2="152" stroke="white" strokeWidth="14" strokeLinecap="round"/>
              <line x1="172" y1="62" x2="172" y2="152" stroke="white" strokeWidth="14" strokeLinecap="round"/>
              <circle cx="131" cy="62" r="8" fill="white"/>
            </svg>
            <h1 className="text-xl font-black tracking-tight text-[var(--theme-text-primary)] text-[var(--theme-text-primary)] select-none">TrackerNote</h1>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <span className="text-sm font-bold text-[var(--theme-text-secondary)] text-[var(--theme-text-secondary)] hidden sm:block">
              {userProfile?.username || user.displayName || user.email}
            </span>
            
            {/* Account Settings trigger Button */}
            <button
              onClick={() => setShowAccountPage(!showAccountPage)}
              className={`p-2.5 rounded-full transition-all ${
                showAccountPage 
                  ? "bg-[var(--theme-accent)] text-indigo-700 dark:bg-[var(--theme-accent)]/50 dark:text-indigo-300" 
                  : "text-[var(--theme-text-secondary)] text-[var(--theme-text-secondary)] hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
              }`}
              title="Account Settings"
            >
              <Settings className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowThemePicker(true)}
              className="p-2 text-[var(--theme-text-secondary)] text-[var(--theme-text-secondary)] hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-full transition-colors"
              title="Appearance"
            >
              <Palette className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-[var(--theme-text-secondary)] text-[var(--theme-text-secondary)] hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-600 dark:hover:text-red-400 rounded-full transition-colors flex items-center"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto relative z-10 w-full h-full">
        {showAccountPage ? (
          <AccountPage user={user} onBack={() => setShowAccountPage(false)} />
        ) : (
          <NotesDashboard user={user} />
        )}
      </main>
      <ThemePicker isOpen={showThemePicker} onClose={() => setShowThemePicker(false)} />
    </div>
  );
}
