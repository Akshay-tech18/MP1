import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import useAuthStore from "../store/useAuthStore";
import { Shield, Github, Chrome, Zap, ArrowRight } from "lucide-react";

const containerVariants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.08, delayChildren: 0.3 },
  },
};

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export default function Login() {
  const { user, mockLogin, loading } = useAuthStore();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState("");
  const [loggingInEmail, setLoggingInEmail] = useState(null);

  useEffect(() => {
    // Force dark mode on login page
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
    
    if (user) {
      navigate("/dashboard");
    }

    return () => {
      // Restore user's theme preference when leaving login
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
      setErrorMsg(res.message || "Failed to log in");
    }
  };

  const handleSocialLogin = (provider) => {
    const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
    window.location.href = `${backendUrl}/auth/${provider}`;
  };

  const mockUsers = [
    {
      name: "Maria Manager",
      email: "manager@devpilot.com",
      role: "MANAGER",
      desc: "Create spaces, complete sprints, and review analytics.",
      gradient: "from-violet-600 to-purple-600",
      iconBg: "bg-violet-500/20",
    },
    {
      name: "Devon Developer",
      email: "developer@devpilot.com",
      role: "DEVELOPER",
      desc: "Assign cards, drag Kanban board, and post task comments.",
      gradient: "from-blue-600 to-cyan-600",
      iconBg: "bg-blue-500/20",
    },
    {
      name: "Quinn QA",
      email: "qa@devpilot.com",
      role: "QA_TESTER",
      desc: "Move cards to Blocked or Tested, verify sprint reports.",
      gradient: "from-emerald-600 to-teal-600",
      iconBg: "bg-emerald-500/20",
    },
    {
      name: "Alex Admin",
      email: "admin@devpilot.com",
      role: "ADMIN",
      desc: "Full administrative controls and system settings.",
      gradient: "from-rose-600 to-pink-600",
      iconBg: "bg-rose-500/20",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden selection:bg-indigo-500/30">
      
      {/* Subtle background radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.12),rgba(255,255,255,0))] pointer-events-none" />

      {/* Main Card */}
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="relative z-10 w-full max-w-[500px]"
      >
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-8 sm:p-10 shadow-2xl">

          {/* Logo & Header */}
          <motion.div variants={itemVariants} className="text-center mb-8 relative z-10">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 bg-indigo-600 text-white shadow-md">
              <Zap className="w-6 h-6" strokeWidth={2.2} />
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Sign in to DevPilot
            </h1>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed max-w-sm mx-auto">
              AI-driven project workspace with real-time sprint collaboration and analytics.
            </p>
          </motion.div>

          {/* Error Message */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs text-center font-medium relative z-10"
            >
              {errorMsg}
            </motion.div>
          )}

          {/* OAuth Buttons */}
          <motion.div variants={itemVariants} className="space-y-2.5 mb-6 relative z-10">
            <button
              onClick={() => handleSocialLogin("google")}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm text-white transition-colors duration-150 border border-white/10 hover:border-white/20 bg-slate-800/60 hover:bg-slate-800"
            >
              <Chrome className="w-4 h-4 text-red-400" />
              Continue with Google
            </button>
            
            <button
              onClick={() => handleSocialLogin("github")}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm text-white transition-colors duration-150 border border-white/10 hover:border-white/20 bg-slate-800/60 hover:bg-slate-800"
            >
              <Github className="w-4 h-4 text-white" />
              Continue with GitHub
            </button>
          </motion.div>

          {/* Divider */}
          <motion.div variants={itemVariants} className="relative mb-6 text-center z-10">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <span className="relative px-3 text-[11px] font-semibold text-slate-400 tracking-wider uppercase bg-slate-900">
              Demo Workspace Accounts
            </span>
          </motion.div>

          {/* Mock Users Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-2.5 relative z-10">
            {mockUsers.map((mockUser) => (
              <button
                key={mockUser.email}
                disabled={loggingInEmail !== null || loading}
                onClick={() => handleMockLogin(mockUser.email)}
                className="group text-left p-3.5 rounded-xl transition-all duration-150 border border-white/5 hover:border-indigo-500/30 bg-slate-800/40 hover:bg-slate-800/70"
              >
                {/* Role Badge */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold text-white bg-gradient-to-br ${mockUser.gradient}`}>
                    {mockUser.name.charAt(0)}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                    {mockUser.role.replace("_", " ")}
                  </span>
                </div>

                {/* Name & Description */}
                <h4 className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors truncate">
                  {mockUser.name}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug line-clamp-2">
                  {mockUser.desc}
                </p>

                {/* Footer */}
                <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono truncate">
                    {mockUser.email.split("@")[0]}
                  </span>
                  {loggingInEmail === mockUser.email ? (
                    <span className="text-[10px] text-indigo-400 font-medium">Entering...</span>
                  ) : (
                    <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 transition-colors group-hover:translate-x-0.5" />
                  )}
                </div>
              </button>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}