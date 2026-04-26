"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type Workspace = {
  id: string;
  name: string;
  description?: string | null;
  members: { userId: string; role: string; user: { name?: string | null; email: string } }[];
  assignments: { id: string; title: string; deadline?: string | null; status: string }[];
};

export default function TeamsPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/workspaces");
    const data = await res.json();
    if (res.ok) setWorkspaces(data);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const createWorkspace = async () => {
    if (!name.trim()) {
      toast.error("Workspace name is required");
      return;
    }
    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Failed to create workspace");
      return;
    }

    toast.success("Workspace created");
    setName("");
    setDescription("");
    await load();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">Classroom & Team Workspace</h1>
        <p className="text-sm text-slate-500 mt-1">Create classes, add members, and track assignment submissions.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="text-lg font-bold text-slate-800 mb-3">Create Workspace</h2>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Workspace name"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={createWorkspace}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-cyan-500"
          >
            Create
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">Loading workspaces...</div>
        ) : workspaces.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">No workspaces yet.</div>
        ) : (
          workspaces.map((ws) => (
            <div key={ws.id} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{ws.name}</h3>
                  {ws.description && <p className="text-sm text-slate-500 mt-1">{ws.description}</p>}
                </div>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">
                  {ws.members.length} members
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">Members</p>
                  <ul className="space-y-1 text-sm text-slate-600">
                    {ws.members.map((m) => (
                      <li key={m.userId} className="flex justify-between">
                        <span>{m.user.name || m.user.email}</span>
                        <span className="text-xs text-slate-400">{m.role}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">Assignments</p>
                  {ws.assignments.length === 0 ? (
                    <p className="text-sm text-slate-500">No assignments.</p>
                  ) : (
                    <ul className="space-y-1 text-sm text-slate-600">
                      {ws.assignments.map((a) => (
                        <li key={a.id} className="flex justify-between">
                          <span>{a.title}</span>
                          <span className="text-xs text-slate-400">{a.status}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
