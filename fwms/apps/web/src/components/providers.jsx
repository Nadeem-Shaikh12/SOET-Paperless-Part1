import { useEffect } from 'react';
import { useAuthStore } from '../stores/auth';

export function Providers({ children }) {
  const initAuth = useAuthStore((state) => state.initAuth);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return <>{children}</>;
}
