import GameComponent from '@/components/GameComponent';
import { Suspense } from 'react';

export default function PlayPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GameComponent />
    </Suspense>
  );
}
