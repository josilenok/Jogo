'use client';

import dynamic from 'next/dynamic';

const CyberSwarm = dynamic(() => import('@/components/game/cyber-swarm'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-[#0A0A12] flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl font-mono font-bold text-[#00FFFF] animate-pulse mb-4">
          CYBER SWARM
        </div>
        <div className="text-sm font-mono text-[#00FFFF]/50">Carregando...</div>
      </div>
    </div>
  ),
});

export default function GameLoader() {
  return <CyberSwarm />;
}
