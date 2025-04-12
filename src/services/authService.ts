// Base URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_BASE_URL = `${API_URL}/api/auth`;

interface LoginResponse {
  message: string;
  token: string;
}

interface ApiError {
  error: string;
}

export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
  console.log('Attempting login with URL:', `${API_BASE_URL}/login`);
  
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Changed to include for cross-origin requests
    body: JSON.stringify({ email, password }),
  });

  const data: LoginResponse | ApiError = await response.json();

  if (!response.ok) {
    // Throw an error with the message from the API response
    throw new Error((data as ApiError).error || `HTTP error! status: ${response.status}`);
  }

  return data as LoginResponse;
};

// Optional: Add registerUser function if needed later
/*
export const registerUser = async (email: string, password: string): Promise<{ message: string; userId: number }> => {
  const response = await fetch(`${API_BASE_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP error! status: ${response.status}`);
  }

  return data;
};
*/
