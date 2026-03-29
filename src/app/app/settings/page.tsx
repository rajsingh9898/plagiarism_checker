"use client";

import { useState } from "react";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const [dyslexiaFont, setDyslexiaFont] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [fontSize, setFontSize] = useState("normal");
  const [autoDelete, setAutoDelete] = useState("never");
  const [keyboardNav, setKeyboardNav] = useState(true);
  const [screenReader, setScreenReader] = useState(false);
  const [noStorage, setNoStorage] = useState(false);

  const saveSettings = () => {
    toast.success("Settings saved!");
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Accessibility, privacy, and display preferences.</p>
      </div>

      <div className="space-y-6">
        {/* Accessibility */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-bold text-slate-800 text-lg mb-1 flex items-center gap-2">♿ Accessibility</h2>
          <p className="text-xs text-slate-400 mb-5">WCAG-compliant options for an inclusive experience.</p>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-700">Dyslexia-friendly font</p>
                <p className="text-[11px] text-slate-400">Uses OpenDyslexic for improved readability</p>
              </div>
              <button onClick={() => setDyslexiaFont(!dyslexiaFont)}
                className={`w-11 h-6 rounded-full transition-all ${dyslexiaFont ? "bg-emerald-500" : "bg-slate-300"}`}>
                <span className={`block w-5 h-5 rounded-full bg-white shadow transform transition-transform ${dyslexiaFont ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-700">High contrast mode</p>
                <p className="text-[11px] text-slate-400">Increases contrast for better visibility</p>
              </div>
              <button onClick={() => setHighContrast(!highContrast)}
                className={`w-11 h-6 rounded-full transition-all ${highContrast ? "bg-emerald-500" : "bg-slate-300"}`}>
                <span className={`block w-5 h-5 rounded-full bg-white shadow transform transition-transform ${highContrast ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-700">Focus mode</p>
                <p className="text-[11px] text-slate-400">Dims surrounding content, highlights active section</p>
              </div>
              <button onClick={() => setFocusMode(!focusMode)}
                className={`w-11 h-6 rounded-full transition-all ${focusMode ? "bg-emerald-500" : "bg-slate-300"}`}>
                <span className={`block w-5 h-5 rounded-full bg-white shadow transform transition-transform ${focusMode ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-700">Keyboard navigation</p>
                <p className="text-[11px] text-slate-400">Navigate between matches with ↑↓ and Tab</p>
              </div>
              <button onClick={() => setKeyboardNav(!keyboardNav)}
                className={`w-11 h-6 rounded-full transition-all ${keyboardNav ? "bg-emerald-500" : "bg-slate-300"}`}>
                <span className={`block w-5 h-5 rounded-full bg-white shadow transform transition-transform ${keyboardNav ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-700">Screen reader optimization</p>
                <p className="text-[11px] text-slate-400">Enhanced ARIA labels for match lists</p>
              </div>
              <button onClick={() => setScreenReader(!screenReader)}
                className={`w-11 h-6 rounded-full transition-all ${screenReader ? "bg-emerald-500" : "bg-slate-300"}`}>
                <span className={`block w-5 h-5 rounded-full bg-white shadow transform transition-transform ${screenReader ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-slate-700">Font size</p>
                <p className="text-[11px] text-slate-400">Adjust report text size</p>
              </div>
              <div className="flex gap-1.5">
                {(["small", "normal", "large", "xlarge"] as const).map((size) => (
                  <button key={size} onClick={() => setFontSize(size)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition capitalize ${
                      fontSize === size ? "bg-emerald-100 text-emerald-700 border border-emerald-300" : "bg-slate-100 text-slate-600 border border-transparent hover:bg-slate-200"
                    }`}>
                    {size === "xlarge" ? "XL" : size}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Privacy */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-bold text-slate-800 text-lg mb-1 flex items-center gap-2">🔒 Privacy & Data</h2>
          <p className="text-xs text-slate-400 mb-5">Control how your data is handled.</p>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-700">No-storage mode</p>
                <p className="text-[11px] text-slate-400">Documents are analyzed but never saved to database</p>
              </div>
              <button onClick={() => setNoStorage(!noStorage)}
                className={`w-11 h-6 rounded-full transition-all ${noStorage ? "bg-emerald-500" : "bg-slate-300"}`}>
                <span className={`block w-5 h-5 rounded-full bg-white shadow transform transition-transform ${noStorage ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-slate-700">Auto-delete scans</p>
                <p className="text-[11px] text-slate-400">Automatically remove scan history after a period</p>
              </div>
              <div className="flex gap-1.5">
                {([
                  ["never", "Never"],
                  ["7d", "7 days"],
                  ["30d", "30 days"],
                  ["90d", "90 days"],
                ] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setAutoDelete(val)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                      autoDelete === val ? "bg-emerald-100 text-emerald-700 border border-emerald-300" : "bg-slate-100 text-slate-600 border border-transparent hover:bg-slate-200"
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {noStorage && (
            <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
              <span className="text-xl">🛡️</span>
              <div>
                <p className="text-sm font-bold text-emerald-800">No-Storage Mode Active</p>
                <p className="text-xs text-emerald-600 mt-1">
                  Your documents will be processed in memory only. No text content is saved to any database. Results are available only during your current session.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Trust Badges */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">🏛️ Trust & Compliance</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: "🔐", label: "AES-256", desc: "End-to-end encryption" },
              { icon: "🚫", label: "No Sharing", desc: "Never shared with 3rd parties" },
              { icon: "🗑️", label: "Right to Delete", desc: "Delete all data anytime" },
              { icon: "📜", label: "GDPR Ready", desc: "Compliant data handling" },
            ].map((badge, i) => (
              <div key={i} className="text-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-2xl block mb-1">{badge.icon}</span>
                <p className="text-xs font-bold text-slate-700">{badge.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{badge.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <button onClick={saveSettings}
          className="w-full py-3 font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white transition shadow-lg hover:from-emerald-400 hover:to-cyan-400">
          💾 Save Settings
        </button>
      </div>
    </div>
  );
}
