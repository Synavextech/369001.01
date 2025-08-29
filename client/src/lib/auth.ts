import { AuthProvider } from "@/hooks/useAuth";

export { AuthProvider };

// Auth utilities
export const getStoredUser = () => {
  try {
    const storedUser = localStorage.getItem('promo-g-user');
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
};

export const clearStoredUser = () => {
  localStorage.removeItem('promo-g-user');
};

export const storeUser = (user: any) => {
  localStorage.setItem('promo-g-user', JSON.stringify(user));
};
