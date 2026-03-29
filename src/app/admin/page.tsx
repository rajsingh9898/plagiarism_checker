"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

type User = { id: string; email: string; role: string; createdAt: string; _count: { scans: number } };
type Doc = { id: string; name: string; uploadedAt: string };

export default function AdminPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [docs, setDocs] = useState<Doc[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [uRes, dRes] = await Promise.all([
                fetch("/api/users"),
                fetch("/api/upload") // this is the GET route for corpus
            ]);
            if (uRes.ok) setUsers(await uRes.json());
            if (dRes.ok) setDocs(await dRes.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (id: string, newRole: string) => {
        try {
            const res = await fetch("/api/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, role: newRole })
            });
            if (res.ok) {
                toast.success("Role updated");
                fetchData();
            } else {
                toast.error("Failed to update role");
            }
        } catch (e) {
            toast.error("An error occurred");
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                toast.success("Document added to corpus");
                setFile(null);
                fetchData();
            } else {
                const data = await res.json();
                toast.error(data.error || "Upload failed");
            }
        } catch (e) {
            toast.error("An error occurred");
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteDoc = async (id: string) => {
        if (!confirm("Are you sure you want to delete this document?")) return;
        try {
            const res = await fetch(`/api/upload?id=${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Document deleted");
                fetchData();
            } else {
                toast.error("Failed to delete document");
            }
        } catch {
            toast.error("An error occurred");
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-xl font-bold mb-4">Manage Corpus Documents</h2>
                <form onSubmit={handleUpload} className="flex gap-4 items-end mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Upload New Reference File</label>
                        <input type="file" accept=".txt,.pdf,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                    </div>
                    <button type="submit" disabled={uploading || !file} className="px-4 py-2 bg-blue-600 text-white rounded shadow text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                        {uploading ? "Uploading..." : "Upload"}
                    </button>
                </form>

                {docs.length === 0 ? <p className="text-sm text-gray-500">No documents in corpus.</p> : (
                    <ul className="divide-y divide-gray-200 border rounded-md">
                        {docs.map(doc => (
                            <li key={doc.id} className="p-4 flex justify-between items-center bg-gray-50 hover:bg-gray-100">
                                <div>
                                    <p className="font-medium text-gray-900">{doc.name}</p>
                                    <p className="text-xs text-gray-500">Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                                </div>
                                <button onClick={() => handleDeleteDoc(doc.id)} className="text-red-600 hover:text-red-900 text-sm font-medium px-3 py-1 bg-red-50 rounded">Delete</button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-xl font-bold mb-4">Manage Users</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scans</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <select value={user.role} onChange={(e) => handleRoleChange(user.id, e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-1 border">
                                            <option value="USER">USER</option>
                                            <option value="ADMIN">ADMIN</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user._count.scans}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
