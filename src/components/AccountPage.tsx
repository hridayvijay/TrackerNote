import React, { useState, useEffect } from "react";
import {
  User,
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  getUserProfile,
  checkUsernameAvailable,
  updateUsername,
  saveUsername,
  UserProfile,
} from "../services";
import {
  ArrowLeft,
  User as UserIcon,
  Mail,
  Lock,
  Check,
  CheckCircle2,
  XCircle,
  Chrome,
  Shield,
  RefreshCw,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { GoogleGenAI } from "@google/genai";

interface AccountPageProps {
  onBack: () => void;
  user: User;
}

export default function AccountPage({ onBack, user }: AccountPageProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Linked options state
  const [isGoogleLinked, setIsGoogleLinked] = useState(false);
  const [isEmailLinked, setIsEmailLinked] = useState(false);

  // Link Email Form state
  const [linkEmail, setLinkEmail] = useState("");
  const [linkUsername, setLinkUsername] = useState("");
  const [linkPassword, setLinkPassword] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null,
  );
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [linkSuccess, setLinkSuccess] = useState("");
  const [submittingLink, setSubmittingLink] = useState(false);

  // Change Username state
  const [newUsername, setNewUsername] = useState("");
  const [usernameChangeAvailable, setUsernameChangeAvailable] = useState<
    boolean | null
  >(null);
  const [checkingChangeUsername, setCheckingChangeUsername] = useState(false);
  const [usernameChangeError, setUsernameChangeError] = useState("");
  const [usernameChangeSuccess, setUsernameChangeSuccess] = useState("");
  const [submittingChangeUsername, setSubmittingChangeUsername] =
    useState(false);

  // Change Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [submittingPassword, setSubmittingPassword] = useState(false);

  // Gemini API Key state
  const [geminiKey, setGeminiKey] = useState("");
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [savingGeminiKey, setSavingGeminiKey] = useState(false);
  const [geminiKeyError, setGeminiKeyError] = useState("");
  const [geminiKeySuccess, setGeminiKeySuccess] = useState("");
  const [testingGeminiKey, setTestingGeminiKey] = useState(false);
  const [geminiKeyValid, setGeminiKeyValid] = useState<boolean | null>(null);

  // Load profile and provider data
  const loadProfileData = async () => {
    try {
      setLoadingProfile(true);
      const prof = await getUserProfile(user.uid);
      setProfile(prof);
      if (prof) {
        setNewUsername(prof.username);
      }

      // Load settings
      const settingsRef = doc(db, "users", user.uid, "settings", "integrations");
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        if (data.geminiApiKey) {
          setGeminiKey(data.geminiApiKey);
        }
      }
    } catch (err) {
      console.error("Error loading account profile", err);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    loadProfileData();

    // Check linked providers
    const providers = user.providerData.map((p) => p.providerId);
    setIsGoogleLinked(providers.includes("google.com"));
    setIsEmailLinked(providers.includes("password"));
  }, [user]);

  // Username validation helper
  const cleanUsernameString = (name: string) => {
    return name.replace(/[^a-zA-Z0-9_\-]/g, "").substring(0, 30);
  };

  // Real-time check for username when linking email/password account
  useEffect(() => {
    if (linkUsername.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const isAvail = await checkUsernameAvailable(linkUsername);
        setUsernameAvailable(isAvail);
      } catch (err) {
        setUsernameAvailable(false);
      } finally {
        setCheckingUsername(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [linkUsername]);

  // Real-time check for username when changing existing username
  useEffect(() => {
    if (
      !profile ||
      newUsername === profile.username ||
      newUsername.length < 3
    ) {
      setUsernameChangeAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingChangeUsername(true);
      try {
        const isAvail = await checkUsernameAvailable(newUsername);
        setUsernameChangeAvailable(isAvail);
      } catch (err) {
        setUsernameChangeAvailable(false);
      } finally {
        setCheckingChangeUsername(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [newUsername, profile]);

  // Submit linking Email + Password
  const handleLinkEmailPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError("");
    setLinkSuccess("");

    if (!linkEmail || !linkUsername || !linkPassword) {
      setLinkError("Please fill in all fields.");
      return;
    }

    if (linkUsername.length < 3) {
      setLinkError("Username must be at least 3 characters.");
      return;
    }

    if (!usernameAvailable) {
      setLinkError("Username is already taken.");
      return;
    }

    if (linkPassword.length < 6) {
      setLinkError("Password must be at least 6 characters.");
      return;
    }

    setSubmittingLink(true);
    try {
      // 1. Create standard credential
      const credential = EmailAuthProvider.credential(linkEmail, linkPassword);

      // 2. Link credential to existing Google account
      await linkWithCredential(user, credential);

      // 3. Create profile in Firestore users & usernames lookup
      await saveUsername(user.uid, linkUsername, linkEmail);

      // 4. Update display name in Auth
      await updateProfile(user, { displayName: linkUsername });

      setLinkSuccess(
        "Email and Password login successfully linked! See settings update.",
      );
      setIsEmailLinked(true);

      // Reset forms
      setLinkEmail("");
      setLinkUsername("");
      setLinkPassword("");
      setUsernameAvailable(null);

      // Reload profile
      await loadProfileData();
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setLinkError(
          "This email address is already registered to another account.",
        );
      } else if (err.code === "auth/credential-already-in-use") {
        setLinkError("This email is already linked with another account.");
      } else {
        setLinkError(
          err.message || "An error occurred while linking your account.",
        );
      }
    } finally {
      setSubmittingLink(false);
    }
  };

  // Submit username change
  const handleChangeUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameChangeError("");
    setUsernameChangeSuccess("");

    if (!profile) return;
    const cleaned = cleanUsernameString(newUsername);

    if (cleaned === profile.username) {
      return;
    }

    if (cleaned.length < 3) {
      setUsernameChangeError("username must be at least 3 characters.");
      return;
    }

    if (!usernameChangeAvailable) {
      setUsernameChangeError("Username is already taken.");
      return;
    }

    setSubmittingChangeUsername(true);
    try {
      await updateUsername(user.uid, cleaned, profile.username);
      await updateProfile(user, { displayName: cleaned });
      setUsernameChangeSuccess("Username successfully updated!");
      await loadProfileData();
    } catch (err: any) {
      console.error(err);
      setUsernameChangeError(err.message || "Failed to update username.");
    } finally {
      setSubmittingChangeUsername(false);
    }
  };

  // Submit password change (for email-linked accounts)
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setSubmittingPassword(true);
    try {
      await updatePassword(user, newPassword);
      setPasswordSuccess("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/requires-recent-login") {
        setPasswordError(
          "For security purposes, please log out and log back in to change your password.",
        );
      } else {
        setPasswordError(err.message || "Failed to update password.");
      }
    } finally {
      setSubmittingPassword(false);
    }
  };

  const handleTestGeminiKey = async () => {
    setGeminiKeyError("");
    setGeminiKeySuccess("");
    setGeminiKeyValid(null);

    if (!geminiKey.trim()) {
      setGeminiKeyError("Please enter an API key to test.");
      return;
    }

    setTestingGeminiKey(true);
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey.trim() });
      // Minimal call to verify key
      await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: 'reply with exactly "ok"',
      });
      setGeminiKeyValid(true);
    } catch (err: any) {
      setGeminiKeyValid(false);
      setGeminiKeyError("Invalid API Key or connection error.");
    } finally {
      setTestingGeminiKey(false);
    }
  };

  const handleSaveGeminiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeminiKeyError("");
    setGeminiKeySuccess("");

    setSavingGeminiKey(true);
    try {
      const settingsRef = doc(db, "users", user.uid, "settings", "integrations");
      await setDoc(
        settingsRef,
        { geminiApiKey: geminiKey.trim() },
        { merge: true },
      );
      setGeminiKeySuccess("Gemini API key saved successfully.");
    } catch (err: any) {
      setGeminiKeyError("Failed to save API key.");
    } finally {
      setSavingGeminiKey(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 relative z-10 font-sans">
      <div className="flex items-center space-x-4 mb-8">
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all flex items-center justify-center"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Account Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configure your authentication, username profile, and login methods
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card & Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-500/25 mb-4">
              {profile?.username?.charAt(0).toUpperCase() ||
                user.displayName?.charAt(0).toUpperCase() ||
                user.email?.charAt(0).toUpperCase() ||
                "?"}
            </div>

            {loadingProfile ? (
              <div className="animate-pulse space-y-2 w-full mt-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mx-auto" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mx-auto" />
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white truncate max-w-full">
                  {profile?.username || "No Username set"}
                </h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate max-w-full mb-4">
                  {user.email}
                </p>

                <div className="w-full pt-4 border-t border-slate-200 dark:border-slate-800/80 text-left space-y-3">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block">
                    Authed Methods
                  </span>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs font-semibold bg-white/40 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center space-x-2">
                        <Chrome className="w-4 h-4 text-blue-500" />
                        <span>Google Auth</span>
                      </div>
                      {isGoogleLinked ? (
                        <span className="text-emerald-500 flex items-center">
                          <Check className="w-3.5 h-3.5 mr-1" /> Linked
                        </span>
                      ) : (
                        <span className="text-slate-400">Not Linked</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs font-semibold bg-white/40 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center space-x-2">
                        <Lock className="w-4 h-4 text-slate-500" />
                        <span>Email & Password</span>
                      </div>
                      {isEmailLinked ? (
                        <span className="text-emerald-500 flex items-center">
                          <Check className="w-3.5 h-3.5 mr-1" /> Linked
                        </span>
                      ) : (
                        <span className="text-slate-400">Not Linked</span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {!isEmailLinked && !loadingProfile && (
            <div className="bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 text-amber-700 dark:text-amber-300 p-5 rounded-2xl flex items-start space-x-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 select-none mt-0.5" />
              <div>
                <span className="font-bold block mb-1">
                  Backup Auth Recommended
                </span>
                <span>
                  You currently only sign in with Google. Link an email &
                  password credentials underneath to allow logging in through
                  both credentials anytime.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Configurations */}
        <div className="md:col-span-2 space-y-8">
          {/* 1. Profile Username Settings */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl space-y-6">
            <div>
              <h2 className="text-xl font-bold flex items-center text-slate-900 dark:text-white">
                <Shield className="w-5 h-5 mr-2 text-indigo-500" />
                Change Username Profile
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                This updates your master identity saved in Firestore across
                TrackerNote.
              </p>
            </div>

            {loadingProfile ? (
              <div className="space-y-4">
                <div className="h-10 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-xl" />
              </div>
            ) : (
              <form onSubmit={handleChangeUsername} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Username
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) =>
                        setNewUsername(cleanUsernameString(e.target.value))
                      }
                      placeholder="Enter new username"
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white/50 dark:bg-slate-900/50"
                      maxLength={30}
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                      {checkingChangeUsername && (
                        <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
                      )}
                      {!checkingChangeUsername &&
                        usernameChangeAvailable === true && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                      {!checkingChangeUsername &&
                        usernameChangeAvailable === false && (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                    </div>
                  </div>
                  {usernameChangeAvailable === true && (
                    <p className="text-xs text-emerald-500 font-medium">
                      ✨ Username is available
                    </p>
                  )}
                  {usernameChangeAvailable === false && (
                    <p className="text-xs text-red-500 font-medium">
                      ❌ Username is already taken
                    </p>
                  )}
                </div>

                {usernameChangeError && (
                  <div className="text-sm font-medium text-red-600 bg-red-100/50 dark:bg-red-900/30 p-3 rounded-xl">
                    {usernameChangeError}
                  </div>
                )}

                {usernameChangeSuccess && (
                  <div className="text-sm font-medium text-emerald-600 bg-emerald-100/50 dark:bg-emerald-900/30 p-3 rounded-xl">
                    {usernameChangeSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    submittingChangeUsername ||
                    usernameChangeAvailable === false ||
                    (profile && newUsername === profile.username)
                  }
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-5 py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingChangeUsername ? "Updating..." : "Save Username"}
                </button>
              </form>
            )}
          </div>

          {/* 2. Link Email + Password form (Optional if not linked) */}
          {!isEmailLinked && (
            <div className="glass-panel p-6 sm:p-8 rounded-3xl space-y-6">
              <div>
                <h2 className="text-xl font-bold flex items-center text-slate-900 dark:text-white">
                  <Lock className="w-5 h-5 mr-2 text-cyan-500" />
                  Add Email & Password Login
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Unlock logging in with credentials by submitting your
                  credentials below
                </p>
              </div>

              <form onSubmit={handleLinkEmailPassword} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        value={linkEmail}
                        onChange={(e) => setLinkEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white/50 dark:bg-slate-900/50"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Chosen Username
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={linkUsername}
                        onChange={(e) =>
                          setLinkUsername(cleanUsernameString(e.target.value))
                        }
                        placeholder="Chosen username"
                        className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white/50 dark:bg-slate-900/50"
                        required
                      />
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                        {checkingUsername && (
                          <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
                        )}
                        {!checkingUsername && usernameAvailable === true && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                        {!checkingUsername && usernameAvailable === false && (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    {usernameAvailable === true && (
                      <p className="text-xs text-emerald-500 font-medium">
                        ✨ Username is available
                      </p>
                    )}
                    {usernameAvailable === false && (
                      <p className="text-xs text-red-500 font-medium">
                        ❌ Username is already taken
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Secure Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={linkPassword}
                      onChange={(e) => setLinkPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white/50 dark:bg-slate-900/50"
                      required
                    />
                  </div>
                </div>

                {linkError && (
                  <div className="text-sm font-medium text-red-600 bg-red-100/50 dark:bg-red-900/30 p-3 rounded-xl">
                    {linkError}
                  </div>
                )}

                {linkSuccess && (
                  <div className="text-sm font-medium text-emerald-600 bg-emerald-100/50 dark:bg-emerald-900/30 p-3 rounded-xl">
                    {linkSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingLink || usernameAvailable === false}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-sm px-5 py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingLink ? "Linking accounts..." : "Link Credentials"}
                </button>
              </form>
            </div>
          )}

          {/* 3. Change password Form (If Email registration is linked) */}
          {isEmailLinked && (
            <div className="glass-panel p-6 sm:p-8 rounded-3xl space-y-6">
              <div>
                <h2 className="text-xl font-bold flex items-center text-slate-900 dark:text-white">
                  <Lock className="w-5 h-5 mr-2 text-emerald-500" />
                  Change Password
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Submit a secure password update for email credentials
                </p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white/50 dark:bg-slate-900/50"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white/50 dark:bg-slate-900/50"
                      required
                    />
                  </div>
                </div>

                {passwordError && (
                  <div className="text-sm font-medium text-red-600 bg-red-100/50 dark:bg-red-900/30 p-3 rounded-xl">
                    {passwordError}
                  </div>
                )}

                {passwordSuccess && (
                  <div className="text-sm font-medium text-emerald-600 bg-emerald-100/50 dark:bg-emerald-900/30 p-3 rounded-xl">
                    {passwordSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingPassword}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-5 py-3 rounded-xl transition-all disabled:opacity-50"
                >
                  {submittingPassword
                    ? "Updating Password..."
                    : "Update Password"}
                </button>
              </form>
            </div>
          )}

          {/* 4. Integrations */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl space-y-6">
            <div>
              <h2 className="text-xl font-bold flex items-center text-slate-900 dark:text-white">
                <Sparkles className="w-5 h-5 mr-2 text-fuchsia-500" />
                Integrations
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Configure external services and AI capabilities
              </p>
            </div>

            <form onSubmit={handleSaveGeminiKey} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Gemini API Key
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showGeminiKey ? "text" : "password"}
                    value={geminiKey}
                    onChange={(e) => {
                      setGeminiKey(e.target.value);
                      setGeminiKeyValid(null);
                    }}
                    placeholder="AIzaSy..."
                    className="w-full pl-10 pr-24 py-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 bg-white/50 dark:bg-slate-900/50"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                    {testingGeminiKey && (
                      <RefreshCw className="w-4 h-4 text-fuchsia-500 animate-spin" />
                    )}
                    {!testingGeminiKey && geminiKeyValid === true && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    )}
                    {!testingGeminiKey && geminiKeyValid === false && (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}

                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
                      title={showGeminiKey ? "Hide key" : "Show key"}
                    >
                      {showGeminiKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {geminiKeyError && (
                <div className="text-sm font-medium text-red-600 bg-red-100/50 dark:bg-red-900/30 p-3 rounded-xl">
                  {geminiKeyError}
                </div>
              )}

              {geminiKeySuccess && (
                <div className="text-sm font-medium text-emerald-600 bg-emerald-100/50 dark:bg-emerald-900/30 p-3 rounded-xl">
                  {geminiKeySuccess}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleTestGeminiKey}
                  disabled={testingGeminiKey || !geminiKey}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 font-bold text-sm px-5 py-3 rounded-xl transition-all disabled:opacity-50"
                >
                  {testingGeminiKey ? "Testing..." : "Test Key"}
                </button>
                <button
                  type="submit"
                  disabled={savingGeminiKey}
                  className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold text-sm px-5 py-3 rounded-xl transition-all disabled:opacity-50"
                >
                  {savingGeminiKey ? "Saving..." : "Save Key"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
