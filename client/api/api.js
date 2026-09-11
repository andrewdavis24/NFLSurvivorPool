const API_URL = import.meta.env.VITE_API_URL;

export async function checkServerHealth() {
  const response = await fetch(`${API_URL}/api/health`);

  if (!response.ok) {
    throw new Error("Failed to connect to server");
  }

  return response.json();
}