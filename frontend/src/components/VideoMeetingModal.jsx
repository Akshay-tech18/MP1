import React from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { JitsiMeeting } from "@jitsi/react-sdk";
import { X, Video, Maximize2, Users, Shield } from "lucide-react";

export default function VideoMeetingModal({ isOpen, onClose, currentProject, user }) {
  if (!isOpen) return null;

  const roomName = currentProject
    ? `devpilot-room-${currentProject.id.replace(/[^a-zA-Z0-9]/g, "")}`
    : `devpilot-room-global`;

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/65 backdrop-blur-md flex items-center justify-center z-[9999] p-3 sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 20 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-5xl h-[85vh] rounded-3xl flex flex-col overflow-hidden relative z-10 bg-[#0a0a0c]/85 backdrop-blur-3xl border border-white/[0.14] shadow-[0_30px_90px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.2)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Ambient top specular reflection line */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

          {/* Meeting Modal Header */}
          <div className="h-16 px-6 border-b border-white/[0.08] flex items-center justify-between flex-shrink-0 bg-white/[0.02] backdrop-blur-2xl">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                <Video className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>{currentProject ? currentProject.name : "DevPilot"} Workspace Call</span>
                  <span className="text-[10px] uppercase font-mono tracking-wider px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
                    WebRTC Encrypted
                  </span>
                </h4>
                <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                  Room: {roomName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.05] hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-white/[0.08] hover:border-rose-500/30 transition-all"
                title="Leave Meeting"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* Jitsi Meeting Container */}
          <div className="flex-1 w-full h-full relative dark:bg-dp-dark-bg bg-black">
            <JitsiMeeting
              domain="meet.jit.si"
              roomName={roomName}
              configOverwrite={{
                startWithAudioMuted: true,
                disableDeepLinking: true,
                prejoinPageEnabled: false,
                toolbarButtons: [
                  "camera",
                  "chat",
                  "closedcaptions",
                  "desktop",
                  "filmstrip",
                  "fullscreen",
                  "hangup",
                  "microphone",
                  "participants-pane",
                  "profile",
                  "raisehand",
                  "select-background",
                  "settings",
                  "tileview",
                  "toggle-camera",
                  "videoquality",
                ],
              }}
              interfaceConfigOverwrite={{
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false,
                SHOW_BRAND_WATERMARK: false,
                BRAND_WATERMARK_LINK: "",
                DEFAULT_REMOTE_DISPLAY_NAME: "DevPilot Colleague",
              }}
              userInfo={{
                displayName: user?.name || "DevPilot User",
                email: user?.email || "",
              }}
              onReadyToClose={onClose}
              getIFrameRef={(iframeRef) => {
                iframeRef.style.height = "100%";
                iframeRef.style.width = "100%";
                iframeRef.style.border = "none";
              }}
              spinner={() => (
                <div className="absolute inset-0 flex flex-col items-center justify-center dark:bg-dp-dark-bg bg-slate-900 gap-3">
                  <div className="spinner-gradient" />
                  <span className="text-xs font-medium text-slate-400">
                    Connecting to secure Jitsi room...
                  </span>
                </div>
              )}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
