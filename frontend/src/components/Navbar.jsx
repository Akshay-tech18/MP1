import React, { useState } from "react";
import useAuthStore from "../store/useAuthStore";
import useSocketStore from "../store/useSocketStore";
import { Video, Globe, Info, AlertTriangle } from "lucide-react";

export default function Navbar() {
  const { currentProject } = useAuthStore();
  const { connected } = useSocketStore();
  const [showZegoAlert, setShowZegoAlert] = useState(false);

  return (
    <div className="h-14 bg-white border-b border-clickup-light-border px-6 flex items-center justify-between select-none">
      {/* 1. Project Title */}
      <div className="flex items-center gap-3">
        <span className="font-semibold text-slate-800 text-base">
          {currentProject ? currentProject.name : "DevPilot Workspace"}
        </span>
        {currentProject && (
          <span className="text-[11px] text-clickup-text-secondary bg-slate-100 px-2 py-0.5 rounded font-medium capitalize">
            {currentProject.status.toLowerCase()}
          </span>
        )}
      </div>

      {/* 2. Global Actions Bar */}
      <div className="flex items-center gap-4">
        {/* Real-time sync indicator */}
        <div className="flex items-center gap-1.5" title={connected ? "Socket connected - real-time sync active" : "Socket disconnected - offline fallback active"}>
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></span>
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            {connected ? "Sync Connected" : "Syncing..."}
          </span>
        </div>

        {/* Video Call button (ZegoCloud - Coming Soon) */}
        <button
          onClick={() => setShowZegoAlert(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-clickup-primary hover:bg-clickup-primary/95 rounded transition shadow-sm"
        >
          <Video className="w-3.5 h-3.5" />
          Start Call
        </button>
      </div>

      {/* ZegoCloud placeholder popup alert */}
      {showZegoAlert && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 text-slate-800">
          <div className="bg-white rounded-lg shadow-xl w-sm p-6 text-center animate-in fade-in zoom-in-95 duration-100">
            <div className="w-12 h-12 rounded-full bg-clickup-primary/10 text-clickup-primary flex items-center justify-center mx-auto mb-3">
              <Video className="w-6 h-6" />
            </div>
            
            <h4 className="font-bold text-slate-900 text-md">ZegoCloud UIKit Integration</h4>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Video and audio conferencing strategy via WebRTC is configured on the backend. Client integration is currently under development.
            </p>
            
            <div className="mt-2 bg-amber-50 text-amber-800 border border-amber-200 p-2.5 rounded text-[10px] text-left flex items-start gap-1.5 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>Coming Soon: WebRTC group calls and direct voice handshakes are planned in Module 10.</span>
            </div>

            <button
              onClick={() => setShowZegoAlert(false)}
              className="mt-4 px-4 py-2 w-full text-xs font-bold text-white bg-slate-800 hover:bg-slate-950 rounded transition"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
