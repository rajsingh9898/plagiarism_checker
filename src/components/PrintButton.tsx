"use client";

export default function PrintButton() {
    return (
        <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-gray-800 text-white rounded shadow text-sm font-medium hover:bg-gray-700 print:hidden"
        >
            Print to PDF
        </button>
    );
}
