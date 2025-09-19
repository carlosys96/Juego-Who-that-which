'use client';
import { Suspense } from 'react';
import AdminPanel from '@/components/AdminPanel';

export default function AdminPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminPanel />
    </Suspense>
  );
}
