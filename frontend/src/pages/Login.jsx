import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import { Shield, Lock, ShieldCheck, Github, Chrome } from "lucide-react";

export default function Login() {
  const { user, mockLogin, loading } = useAuthStore();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState("");
  const [loggingInEmail, setLoggingInEmail] = useState(null);

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
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
      desc: "Create spaces, complete sprints, and review analytics."
    },
    {
      name: "Devon Developer",
      email: "developer@devpilot.com",
      role: "DEVELOPER",
      desc: "Assign cards, drag Kanban board, and post task comments."
    },
    {
      name: "Quinn QA",
      email: "qa@devpilot.com",
      role: "QA_TESTER",
      desc: "Move cards to Blocked or Tested, verify sprint reports."
    },
    {
      name: "Alex Admin",
      email: "admin@devpilot.com",
      role: "ADMIN",
      desc: "Full administrative controls and system settings."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 selection:bg-clickup-primary selection:text-white">
      {/* Decorative gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-clickup-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-clickup-pink/10 rounded-full blur-3xl"></div>

      <div className="bg-slate-950/80 border border-slate-800 rounded-xl shadow-2xl w-full max-w-lg p-8 relative z-10 backdrop-blur-md">
        {/* Header Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-clickup-primary/20 text-clickup-primary border border-clickup-primary/30 mb-3 shadow-inner">
            <span className="w-4 h-4 rounded-full bg-clickup-pink animate-ping absolute"></span>
            <span className="w-4 h-4 rounded-full bg-clickup-pink"></span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Welcome to DevPilot</h2>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Agile Project Management Workspace with GitHub Analysis & Bug Predictions
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 bg-red-950/30 border border-red-800 text-red-400 p-3 rounded text-xs text-center font-medium">
            {errorMsg}
          </div>
        )}

        {/* OAuth Buttons */}
        <div className="space-y-3 mb-8">
          <button
            onClick={() => handleSocialLogin("google")}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-slate-800 hover:bg-slate-700/80 text-white rounded font-semibold text-xs border border-slate-700 transition"
          >
            <Chrome className="w-4 h-4 text-red-500" />
            Continue with Google
          </button>
          
          <button
            onClick={() => handleSocialLogin("github")}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-slate-800 hover:bg-slate-700/80 text-white rounded font-semibold text-xs border border-slate-700 transition"
          >
            <Github className="w-4 h-4 text-slate-200" />
            Continue with GitHub
          </button>
        </div>

        {/* Sandbox Bypass Divider */}
        <div className="relative mb-6 text-center">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-800"></span></div>
          <span className="relative bg-slate-950 px-3 text-[10px] font-bold text-slate-500 tracking-widest uppercase">
            DEVELOPER SANDBOX BYPASS
          </span>
        </div>

        {/* Sandbox Accounts Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {mockUsers.map((mockUser) => (
            <button
              key={mockUser.email}
              disabled={loggingInEmail !== null || loading}
              onClick={() => handleMockLogin(mockUser.email)}
              className="group text-left p-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-clickup-primary/45 rounded transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-clickup-primary transition">
                    {mockUser.name}
                  </span>
                  <span className="text-[9px] bg-slate-800 text-slate-400 group-hover:bg-clickup-primary/20 group-hover:text-clickup-primary px-1.5 py-0.5 rounded font-medium">
                    {mockUser.role}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                  {mockUser.desc}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/50 w-full flex items-center justify-between text-[9px] text-slate-500 font-mono">
                <span>{mockUser.email}</span>
                {loggingInEmail === mockUser.email ? (
                  <span className="text-clickup-primary animate-pulse">Entering...</span>
                ) : (
                  <span className="opacity-0 group-hover:opacity-100 text-clickup-primary transition">Login &rarr;</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
