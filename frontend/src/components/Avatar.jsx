import React, { useState } from "react";

const SIZES = {
  xs: "w-5 h-5 text-[9px]",
  sm: "w-6 h-6 text-[10px]",
  md: "w-8 h-8 text-xs",
  lg: "w-9 h-9 text-xs",
  xl: "w-11 h-11 text-sm font-bold",
};

const COLOR_PALETTE = [
  "bg-indigo-600 text-white",
  "bg-violet-600 text-white",
  "bg-blue-600 text-white",
  "bg-emerald-600 text-white",
  "bg-teal-600 text-white",
  "bg-rose-600 text-white",
  "bg-amber-600 text-white",
];

function getInitials(name) {
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 1).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColor(name) {
  if (!name) return COLOR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
}

export default function Avatar({ src, name = "", size = "md", className = "" }) {
  const [imageError, setImageError] = useState(false);
  const sizeClass = SIZES[size] || SIZES.md;
  const initials = getInitials(name);
  const colorClass = getColor(name);

  // If no image or if image failed to load, show initials badge
  if (!src || imageError) {
    return (
      <div
        className={`inline-flex items-center justify-center font-medium rounded-full select-none flex-shrink-0 border border-white/10 ${sizeClass} ${colorClass} ${className}`}
        title={name}
      >
        <span>{initials}</span>
      </div>
    );
  }

  return (
    <div
      className={`relative inline-block rounded-full overflow-hidden flex-shrink-0 border border-white/10 ${sizeClass} ${className}`}
      title={name}
    >
      <img
        src={src}
        alt={name || "User Avatar"}
        onError={() => setImageError(true)}
        className="w-full h-full object-cover rounded-full"
      />
    </div>
  );
}
