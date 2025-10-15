import React, { useState, useEffect } from "react";
import { uploadPDFs, fetchUploadedPDFs, reprocessPDFs, deletePDF } from "../api";

export default function PDFUpload({ onUpload }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const handleFileChange = e => {
    setFiles(Array.from(e.target.files).slice(0, 10));
  };

  const handleUpload = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await uploadPDFs(files);
      setMessage(res.message || "Upload complete!");
      if (res.files) {
        setUploadedFiles(prev => {
          const newFiles = res.files.filter(f => !prev.includes(f));
          return [...prev, ...newFiles];
        });
        setFiles([]);
        effectiveOnUpload(res.files);
      }
    } catch (err) {
      setMessage("Upload failed.");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (typeof onUpload === "function") return;
  }, [onUpload]);

  useEffect(() => {
    fetchUploadedPDFs().then(data => {
      if (data.files) {
        setUploadedFiles([...new Set(data.files)]);
      }
    });
    reprocessPDFs();
  }, []);

  const handleLocalUpload = files => {
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const effectiveOnUpload = onUpload || handleLocalUpload;

  return (
    <div style={{
      maxWidth: 500,
      margin: '32px auto',
      padding: 24,
      background: '#f4f6fb',
      borderRadius: 18,
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      border: '1px solid #e3e6ee',
    }}>
      <h2 style={{ color: '#1976d2', marginBottom: 18, fontWeight: 700, letterSpacing: 1 }}>PDF Chatbot Upload</h2>
      <label htmlFor="pdf-upload" style={{ display: 'block', marginBottom: 10, fontWeight: 500, color: '#333' }}>
        Select up to 10 PDF files:
      </label>
      <input
        id="pdf-upload"
        type="file"
        multiple
        accept="application/pdf"
        onChange={handleFileChange}
        style={{
          marginBottom: 18,
          padding: 10,
          borderRadius: 10,
          border: '1px solid #bdbdbd',
          background: '#fff',
          width: '100%',
          fontSize: 15,
        }}
      />
      <button
        onClick={handleUpload}
        disabled={loading || files.length === 0}
        style={{
          background: loading || files.length === 0 ? '#bdbdbd' : 'linear-gradient(90deg,#1976d2,#64b5f6)',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          padding: '12px 28px',
          fontWeight: 700,
          fontSize: 16,
          cursor: loading || files.length === 0 ? 'not-allowed' : 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
          transition: 'background 0.2s',
          marginBottom: 8,
        }}
      >
        {loading ? 'Uploading...' : 'Upload PDFs'}
      </button>
      {message && (
        <div style={{
          marginTop: 18,
          padding: 14,
          background: message.includes('failed') ? '#ffebee' : '#e3fcef',
          color: message.includes('failed') ? '#c62828' : '#388e3c',
          borderRadius: 10,
          fontWeight: 600,
          textAlign: 'center',
          fontSize: 15,
        }}>
          {message}
        </div>
      )}
      {uploadedFiles.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <strong style={{ color: '#1976d2' }}>Uploaded files:</strong>
          <ul style={{ paddingLeft: 22, marginTop: 8 }}>
            {[...new Set(uploadedFiles)].map((file, idx) => (
              <li key={idx} style={{ fontSize: 15, color: '#333', marginBottom: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{file}</span>
                <button
                  style={{ marginLeft: 12, background: '#c62828', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontWeight: 600, cursor: 'pointer' }}
                  onClick={async () => {
                    await deletePDF(file.replace('uploaded_pdfs/', ''));
                    setUploadedFiles(prev => prev.filter(f => f !== file));
                  }}
                >Delete</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {files.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <strong style={{ color: '#1976d2' }}>Selected files:</strong>
          <ul style={{ paddingLeft: 22, marginTop: 8 }}>
            {files.map((file, idx) => (
              <li key={idx} style={{ fontSize: 15, color: '#333', marginBottom: 2 }}>{file.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}