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
    <div className="min-h-screen bg-dp-dark-bg flex items-center justify-center p-6 relative overflow-hidden selection:bg-dp-primary/30">
      
      {/* ══════ Ambient Background Orbs ══════ */}
      <div className="orb orb-purple w-[550px] h-[550px] top-[-10%] left-[10%] animate-float" />
      <div className="orb orb-pink w-[450px] h-[450px] bottom-[-5%] right-[15%] animate-float-slow" />
      <div className="orb orb-blue w-[400px] h-[400px] top-[40%] right-[-5%] animate-float-delayed" />

      {/* Noise overlay */}
      <div className="absolute inset-0 noise-overlay" />

      {/* ══════ Main Card ══════ */}
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="relative z-10 w-full max-w-[520px]"
      >
        {/* Glass Card */}
        <div className="glass-card glossy-card p-10 noise-overlay">

          {/* Logo & Header */}
          <motion.div variants={itemVariants} className="text-center mb-8 relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 relative"
                 style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
              <Zap className="w-8 h-8 text-white" strokeWidth={2.5} />
              <div className="absolute inset-0 rounded-2xl animate-glow-pulse" 
                   style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)', opacity: 0.4 }} />
            </div>

            <h1 className="font-display text-3xl font-extrabold text-white" style={{ letterSpacing: '-0.03em' }}>
              Welcome to{" "}
              <span className="text-gradient">DevPilot</span>
            </h1>
            <p className="text-[14px] text-dp-text-muted mt-3 leading-relaxed max-w-sm mx-auto">
              AI-Powered Agile Workspace with GitHub Analytics & Bug Predictions
            </p>
          </motion.div>

          {/* Error Message */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 bg-dp-danger/10 border border-dp-danger/20 text-dp-danger p-3.5 rounded-xl text-[13px] text-center font-medium relative z-10"
            >
              {errorMsg}
            </motion.div>
          )}

          {/* OAuth Buttons */}
          <motion.div variants={itemVariants} className="space-y-3 mb-7 relative z-10">
            <button
              onClick={() => handleSocialLogin("google")}
              className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl font-semibold text-[14px] text-white transition-all duration-200 magnetic-btn border border-dp-dark-border-light/50 hover:border-dp-primary/30 bg-dp-dark-surface/60 hover:bg-dp-dark-surface"
            >
              <Chrome className="w-5 h-5 text-red-400" />
              Continue with Google
            </button>
            
            <button
              onClick={() => handleSocialLogin("github")}
              className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl font-semibold text-[14px] text-white transition-all duration-200 magnetic-btn border border-dp-dark-border-light/50 hover:border-dp-primary/30 bg-dp-dark-surface/60 hover:bg-dp-dark-surface"
            >
              <Github className="w-5 h-5 text-white" />
              Continue with GitHub
            </button>
          </motion.div>

          {/* Divider */}
          <motion.div variants={itemVariants} className="relative mb-6 text-center z-10">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-dp-dark-border-light/40" />
            </div>
            <span className="relative px-4 text-[11px] font-bold text-dp-text-muted tracking-[0.15em] uppercase"
                  style={{ background: 'rgba(17, 24, 39, 0.6)' }}>
              SANDBOX BYPASS
            </span>
          </motion.div>

          {/* Mock Users Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 relative z-10">
            {mockUsers.map((mockUser) => (
              <motion.button
                key={mockUser.email}
                disabled={loggingInEmail !== null || loading}
                onClick={() => handleMockLogin(mockUser.email)}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="group text-left p-4 rounded-2xl transition-all duration-200 border border-dp-dark-border-light/30 hover:border-dp-primary/25 bg-dp-dark-surface/40 hover:bg-dp-dark-surface/70 glow-border glossy-card liquid-press"
              >
                {/* Role Badge */}
                <div className="flex items-center justify-between mb-2.5">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold text-white bg-gradient-to-br ${mockUser.gradient}`}>
                    {mockUser.name.charAt(0)}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-dp-text-muted bg-dp-dark-elevated/60 px-2 py-0.5 rounded-full">
                    {mockUser.role.replace("_", " ")}
                  </span>
                </div>

                {/* Name & Description */}
                <h4 className="text-[13px] font-bold text-white group-hover:text-dp-primary-light transition-colors">
                  {mockUser.name}
                </h4>
                <p className="text-[11px] text-dp-text-muted mt-1.5 leading-relaxed line-clamp-2">
                  {mockUser.desc}
                </p>

                {/* Footer */}
                <div className="mt-3 pt-2.5 border-t border-dp-dark-border-light/20 flex items-center justify-between">
                  <span className="text-[10px] text-dp-text-muted font-mono truncate">
                    {mockUser.email}
                  </span>
                  {loggingInEmail === mockUser.email ? (
                    <span className="text-[11px] text-dp-primary animate-pulse font-semibold">Entering...</span>
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5 text-dp-text-muted opacity-0 group-hover:opacity-100 group-hover:text-dp-primary transition-all duration-200 group-hover:translate-x-0.5" />
                  )}
                </div>
              </motion.button>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}