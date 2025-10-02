'use client';

import { usePathname } from 'next/navigation';
import FloatingSidebar from './FloatingSidebar';

interface FloatingSidebarWrapperProps {
  children: React.ReactNode;
}

export function FloatingSidebarWrapper({ children }: FloatingSidebarWrapperProps) {
  const pathname = usePathname() || '';
  
  // Check if the current path starts with /auth
  const isAuthPage = pathname.startsWith('/auth');
  
  if (isAuthPage) {
    return <>{children}</>;
  }
  
  return (
    <>
      <FloatingSidebar />
      {children}
    </>
  );
}

export default FloatingSidebarWrapper;
