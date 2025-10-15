const BASE_URL = "http://localhost:8000";

export async function uploadPDFs(files) {
  const formData = new FormData();
  files.forEach(file => formData.append("files", file));
  const res = await fetch(`${BASE_URL}/upload_pdfs`, {
    method: "POST",
    body: formData,
  });
  return res.json();
}

export async function chatQuery(query, n_results = 1) {
  const params = new URLSearchParams({ query, n_results });
  const res = await fetch(`${BASE_URL}/chat?${params.toString()}`, {
    method: "POST",
  });
  return res.json();
}

export async function fetchUploadedPDFs() {
  const res = await fetch(`${BASE_URL}/list_pdfs`);
  return res.json();
}

export async function reprocessPDFs() {
  const res = await fetch(`${BASE_URL}/reprocess_pdfs`, {
    method: "POST"
  });
  return res.json();
}

export async function deletePDF(filename) {
  const res = await fetch("http://localhost:8000/delete_pdf", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename })
  });
  return res.json();
}
