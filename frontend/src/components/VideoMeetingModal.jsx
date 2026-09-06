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
        className="fixed inset-0 modal-overlay flex items-center justify-center z-[9999] p-3 sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 15 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card glossy-card w-full max-w-5xl h-[85vh] rounded-2xl flex flex-col overflow-hidden relative z-10 shadow-2xl border dark:border-dp-dark-border-light/60 border-dp-light-border"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Meeting Modal Header */}
          <div className="h-14 px-5 border-b dark:border-dp-dark-border-light/50 border-dp-light-border flex items-center justify-between flex-shrink-0 dark:bg-dp-dark-surface/90 bg-white/90 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-dp-primary/15 text-dp-primary flex items-center justify-center">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-display font-bold text-sm dark:text-dp-text-primary text-dp-text-light-primary flex items-center gap-2">
                  <span>{currentProject ? currentProject.name : "DevPilot"} Workspace Call</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full dark:bg-dp-success/15 bg-dp-success/10 text-dp-success">
                    Live WebRTC
                  </span>
                </h4>
                <p className="text-[11px] font-mono dark:text-dp-text-muted text-dp-text-light-muted">
                  Room: {roomName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center dark:hover:bg-dp-dark-surface-hover hover:bg-dp-light-bg-secondary dark:text-dp-text-muted text-dp-text-light-muted hover:text-dp-danger transition-colors"
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
