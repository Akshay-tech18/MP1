import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import useAuthStore from "../store/useAuthStore";
import ThemeToggle from "../components/ThemeToggle";
import {
  ShieldCheck,
  Github,
  Zap,
  ArrowRight,
  Sparkles,
  Lock,
  Cpu,
  ChevronDown,
} from "lucide-react";

const containerVariants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.07, delayChildren: 0.2 },
  },
};

const itemVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

const MOCK_USERS = [
  {
    name: "Maria Manager",
    email: "manager@devpilot.com",
    role: "PRODUCT LEAD",
    roleDesc: "Sprint planning, workload & analytics",
    gradient: "from-violet-600 via-purple-600 to-indigo-600",
    avatarBg: "bg-violet-600",
    tasksCount: "8 Sprints",
  },
  {
    name: "Devon Developer",
    email: "developer@devpilot.com",
    role: "FULL-STACK",
    roleDesc: "Code reviews, board tasks & branches",
    gradient: "from-blue-600 via-cyan-600 to-teal-600",
    avatarBg: "bg-blue-600",
    tasksCount: "14 Tasks",
  },
  {
    name: "Quinn QA",
    email: "qa@devpilot.com",
    role: "QA TESTER",
    roleDesc: "Regression suites, tests & verifications",
    gradient: "from-emerald-600 via-teal-600 to-green-600",
    avatarBg: "bg-emerald-600",
    tasksCount: "6 Releases",
  },
  {
    name: "Alex Admin",
    email: "admin@devpilot.com",
    role: "ARCHITECT",
    roleDesc: "Full administrative controls & config",
    gradient: "from-rose-600 via-pink-600 to-purple-600",
    avatarBg: "bg-rose-600",
    tasksCount: "Full Access",
  },
];

export default function Login() {
  const { user, mockLogin, loading } = useAuthStore();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState("");
  const [loggingInEmail, setLoggingInEmail] = useState(null);
  const [showDevAccounts, setShowDevAccounts] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");

    if (user) {
      navigate("/dashboard");
    }

    return () => {
      const stored = localStorage.getItem("devpilot_theme") || "dark";
      document.documentElement.classList.remove("dark", "light");
      document.documentElement.classList.add(stored);
    };
  }, [user, navigate]);

  const handleMockLogin = async (email) => {
    setErrorMsg("");
    setLoggingInEmail(email);
    const res = await mockLogin(email);
    setLoggingInEmail(null);

    if (res.success) {
      navigate("/dashboard");
    } else {
      setErrorMsg(res.message || "Unable to reach workspace service");
    }
  };

  const handleSocialLogin = (provider) => {
    const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
    window.location.href = `${backendUrl}/auth/${provider}`;
  };

  return (
    <div className="min-h-screen dark:bg-[#000000] bg-[#f8fafc] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none font-sans dark:text-slate-100 text-slate-800 transition-colors duration-200">

      {/* Floating Theme Toggle on Top-Right */}
      <div className="absolute top-5 right-6 z-50">
        <div className="p-1 rounded-2xl dark:bg-white/[0.04] bg-white border dark:border-white/[0.08] border-slate-200 shadow-sm">
          <ThemeToggle tooltipPlacement="bottom-right" />
        </div>
      </div>

      {/* Background Animated Gradient Orbs */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-indigo-600/20 via-purple-600/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-cyan-600/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-pink-600/10 blur-3xl pointer-events-none" />

      {/* Subtle Background Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Main Glassmorphic Container with Neon Halo Accent */}
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="relative z-10 w-full max-w-[500px]"
      >
        {/* Glowing Gradient Border Wrap */}
        <div className="relative group">
          <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-r from-[#38bdf8]/40 via-[#a855f7]/40 via-[#ec4899]/40 to-[#f59e0b]/40 blur-sm opacity-60 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="relative rounded-3xl border dark:border-white/[0.1] border-slate-200 dark:bg-[#0a0a0c]/90 bg-white/95 backdrop-blur-2xl p-7 sm:p-9 shadow-2xl overflow-hidden transition-colors">

            {/* Top Brand Header */}
            <motion.div variants={itemVariants} className="text-center mb-7">
              {/* Product Badge */}
              <div className="inline-flex items-center px-4 py-1.5 rounded-full dark:bg-[#141417]/90 bg-slate-100 dark:border-white/[0.12] border-slate-200 text-xs font-semibold dark:text-slate-200 text-slate-700 mb-4 shadow-sm backdrop-blur-xl">
                <span>DevPilot v3.0 Edition</span>
              </div>

              {/* Title & Subtitle */}
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight dark:text-white text-slate-900 flex items-center justify-center gap-2">
                <span>Welcome to</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400">
                  DevPilot
                </span>
                <span className="text-xs font-bold text-indigo-500 font-mono -mt-3">v3.0</span>
              </h1>
              <p className="text-xs dark:text-slate-400 text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                Autonomous engineering workspace with real-time sprint boards, team workload matrix, and Nexus² AI.
              </p>
            </motion.div>

            {/* Error Message if any */}
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-300 p-3 rounded-xl text-xs text-center font-medium flex items-center justify-center gap-2"
              >
                <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            {/* Social OAuth Buttons */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-2.5 mb-5">
              <button
                onClick={() => handleSocialLogin("google")}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold dark:text-white text-slate-800 dark:bg-[#161619] bg-slate-50 dark:hover:bg-[#1e1e22] hover:bg-slate-100 border dark:border-white/[0.08] border-slate-200 hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-sm group"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Google</span>
              </button>

              <button
                onClick={() => handleSocialLogin("github")}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold dark:text-white text-slate-800 dark:bg-[#161619] bg-slate-50 dark:hover:bg-[#1e1e22] hover:bg-slate-100 border dark:border-white/[0.08] border-slate-200 hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-sm group"
              >
                <Github className="w-4 h-4 dark:text-slate-200 text-slate-700 group-hover:scale-105 transition-transform" />
                <span>GitHub</span>
              </button>
            </motion.div>

            {/* Divider */}
            <motion.div variants={itemVariants} className="relative mb-5 text-center">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t dark:border-white/[0.08] border-slate-200" />
              </div>
              <span className="relative px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase dark:bg-[#0a0a0c] bg-white">
                Sandbox Access
              </span>
            </motion.div>

            {/* Collapsible One-Click Developer Sandbox Accounts */}
            <motion.div variants={itemVariants} className="mb-4">
              <button
                type="button"
                onClick={() => setShowDevAccounts((prev) => !prev)}
                className="w-full flex items-center justify-between p-3 rounded-2xl dark:bg-[#131316]/80 bg-slate-50 dark:hover:bg-[#1c1c20] hover:bg-slate-100 border dark:border-white/[0.08] border-slate-200 hover:border-indigo-500/40 text-xs font-semibold dark:text-slate-300 text-slate-700 dark:hover:text-white hover:text-slate-900 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-indigo-500 group-hover:rotate-12 transition-transform" />
                  <span>One-Click Developer Sandbox Accounts</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200">
                  <span className="text-[10px] uppercase font-mono tracking-wider dark:bg-white/5 bg-slate-200/60 px-2 py-0.5 rounded border dark:border-white/5 border-slate-200">
                    {showDevAccounts ? "Close" : "Click to view"}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-300 ${showDevAccounts ? "rotate-180 text-indigo-500" : ""
                      }`}
                  />
                </div>
              </button>

              {/* Animated Slide-Down Grid */}
              <AnimatePresence>
                {showDevAccounts && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden pt-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {MOCK_USERS.map((mockUser) => (
                        <button
                          key={mockUser.email}
                          disabled={loggingInEmail !== null || loading}
                          onClick={() => handleMockLogin(mockUser.email)}
                          className="group text-left p-3 rounded-2xl dark:bg-[#121214] bg-slate-50 dark:hover:bg-[#1c1c20] hover:bg-indigo-50/50 border dark:border-white/[0.06] border-slate-200 hover:border-indigo-500/40 transition-all flex flex-col justify-between shadow-sm relative overflow-hidden"
                        >
                          <div className="relative z-10">
                            <div className="flex items-center justify-between mb-2">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br ${mockUser.gradient} shadow-sm`}
                              >
                                {mockUser.name.charAt(0)}
                              </div>
                              <span className="text-[9px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500 dark:bg-white/5 bg-slate-200/60 px-2 py-0.5 rounded border dark:border-white/5 border-slate-200">
                                {mockUser.role}
                              </span>
                            </div>

                            <h4 className="text-xs font-bold dark:text-white text-slate-900 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors truncate">
                              {mockUser.name}
                            </h4>
                            <p className="text-[11px] dark:text-slate-400 text-slate-500 mt-0.5 leading-snug line-clamp-2">
                              {mockUser.roleDesc}
                            </p>
                          </div>

                          <div className="relative z-10 mt-3 pt-2 border-t dark:border-white/[0.04] border-slate-200/60 flex items-center justify-between text-[10px]">
                            <span className="dark:text-slate-500 text-slate-400 font-mono">
                              {mockUser.tasksCount}
                            </span>
                            {loggingInEmail === mockUser.email ? (
                              <span className="text-indigo-500 font-semibold animate-pulse">Entering...</span>
                            ) : (
                              <span className="dark:text-slate-400 text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 flex items-center gap-1 font-semibold transition-colors">
                                <span>Enter</span>
                                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Security & Compliance Footer Badges */}
            <motion.div
              variants={itemVariants}
              className="pt-4 border-t dark:border-white/[0.06] border-slate-200 flex items-center justify-center gap-4 text-[11px] dark:text-slate-400 text-slate-500"
            >
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Zero-Knowledge TLS</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                <span>Real-Time Sockets</span>
              </div>
            </motion.div>

          </div>
        </div>
      </motion.div>

    </div>
  );
}