'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from '@/lib/game/engine';
import { GameState, UpgradeOption, GameStats } from '@/lib/game/types';
import { WEAPON_DEFS } from '@/lib/game/constants';

export default function CyberSwarm() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState>('title');
  const [upgradeOptions, setUpgradeOptions] = useState<UpgradeOption[]>([]);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Initialize engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine();
    engine.init(canvas);
    engineRef.current = engine;

    engine.onStateChange = (state: GameState) => {
      setGameState(state);
      if (state === 'levelup') {
        setUpgradeOptions([...(engine.upgradeOptions ?? [])]);
      }
      if (state === 'gameover' || state === 'victory') {
        setStats({ ...(engine.stats ?? { kills: 0, time: 0, level: 1, character: 'hacker', upgradesCollected: 0 }) });
      }
    };

    // Game loop
    const loop = (time: number) => {
      const dt = lastTimeRef.current ? (time - lastTimeRef.current) / 1000 : 0.016;
      lastTimeRef.current = time;
      engine.update(dt);
      engine.render();
      frameRef.current = requestAnimationFrame(loop);
    };

    // Resize handler
    const handleResize = () => engine.resize();
    window.addEventListener('resize', handleResize);
    handleResize();

    // Start loop
    frameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Keyboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      e.preventDefault();
      engine.handleKeyDown(e.key);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      engineRef.current?.handleKeyUp(e.key);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Click
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const engine = engineRef.current;
    const canvas = canvasRef.current;
    if (!engine || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    engine.handleClick(mx, my);
  }, []);

  const selectUpgrade = useCallback((index: number) => {
    engineRef.current?.selectUpgrade(index);
  }, []);

  const restartGame = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.gameState = 'title';
    setGameState('title');
    engine.onStateChange?.('title');
  }, []);

  const toggleMute = useCallback(() => {
    const muted = engineRef.current?.audio?.toggleMute();
    setIsMuted(muted ?? false);
  }, []);

  const resumeGame = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.gameState = 'playing';
    setGameState('playing');
  }, []);

  return (
    <div className="relative w-full h-screen bg-[#0A0A12] overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onClick={handleCanvasClick}
      />

      {/* LEVEL UP OVERLAY */}
      {gameState === 'levelup' && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20 backdrop-blur-sm">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-mono font-bold text-[#00FF88] mb-2 animate-pulse">
              LEVEL UP!
            </h2>
            <p className="text-[#888] font-mono text-sm mb-6">Escolha um upgrade:</p>
            <div className="flex gap-4 flex-wrap justify-center px-4">
              {(upgradeOptions ?? []).map((opt: UpgradeOption, i: number) => (
                <button
                  key={opt?.type ?? i}
                  onClick={() => selectUpgrade(i)}
                  className="group flex flex-col items-center p-5 rounded-xl border-2 transition-all duration-200 hover:scale-105 w-52"
                  style={{
                    borderColor: opt?.color ?? '#FFF',
                    background: 'rgba(10,10,18,0.95)',
                    boxShadow: `0 0 20px ${opt?.color ?? '#FFF'}33`,
                  }}
                >
                  <span className="text-3xl mb-2">{opt?.icon ?? '?'}</span>
                  <span className="font-mono font-bold text-sm" style={{ color: opt?.color ?? '#FFF' }}>
                    {opt?.name ?? 'Unknown'}
                  </span>
                  {opt?.isNew ? (
                    <span className="text-xs font-mono text-[#00FF88] mt-1">NOVO!</span>
                  ) : (
                    <span className="text-xs font-mono text-[#FFFF00] mt-1">
                      Lv.{(opt?.currentLevel ?? 0)} → Lv.{(opt?.currentLevel ?? 0) + 1}
                    </span>
                  )}
                  <span className="text-xs font-mono text-[#888] mt-2 text-center leading-tight">
                    {opt?.description ?? ''}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PAUSE OVERLAY */}
      {gameState === 'paused' && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20 backdrop-blur-sm">
          <div className="text-center">
            <h2 className="text-4xl font-mono font-bold text-[#00FFFF] mb-6 animate-pulse">
              PAUSADO
            </h2>
            <button
              onClick={resumeGame}
              className="px-8 py-3 font-mono font-bold text-lg rounded-lg bg-[#00FFFF]/10 border-2 border-[#00FFFF] text-[#00FFFF] hover:bg-[#00FFFF]/20 transition-all"
            >
              CONTINUAR
            </button>
            <p className="text-[#555] font-mono text-xs mt-4">ESC para continuar</p>
          </div>
        </div>
      )}

      {/* GAME OVER OVERLAY */}
      {gameState === 'gameover' && stats && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20 backdrop-blur-sm">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-mono font-bold text-[#FF4444] mb-2">
              GAME OVER
            </h2>
            <p className="text-[#FF4444]/60 font-mono text-sm mb-6">Seu avatar foi deletado...</p>
            <div className="grid grid-cols-2 gap-4 mb-8 mx-auto max-w-sm">
              <StatCard label="KILLS" value={String(stats?.kills ?? 0)} color="#FF00FF" />
              <StatCard label="TEMPO" value={formatTime(stats?.time ?? 0)} color="#00FFFF" />
              <StatCard label="NÍVEL" value={String(stats?.level ?? 1)} color="#00FF88" />
              <StatCard label="UPGRADES" value={String(stats?.upgradesCollected ?? 0)} color="#FFFF00" />
            </div>
            <button
              onClick={restartGame}
              className="px-8 py-3 font-mono font-bold text-lg rounded-lg bg-[#FF4444]/10 border-2 border-[#FF4444] text-[#FF4444] hover:bg-[#FF4444]/20 transition-all"
            >
              TENTAR NOVAMENTE
            </button>
          </div>
        </div>
      )}

      {/* VICTORY OVERLAY */}
      {gameState === 'victory' && stats && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20 backdrop-blur-sm">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-mono font-bold text-[#00FF88] mb-2 animate-pulse">
              VITÓRIA!
            </h2>
            <p className="text-[#00FF88]/60 font-mono text-sm mb-6">Você sobreviveu ao ciberespaço!</p>
            <div className="grid grid-cols-2 gap-4 mb-8 mx-auto max-w-sm">
              <StatCard label="KILLS" value={String(stats?.kills ?? 0)} color="#FF00FF" />
              <StatCard label="TEMPO" value={formatTime(stats?.time ?? 0)} color="#00FFFF" />
              <StatCard label="NÍVEL" value={String(stats?.level ?? 1)} color="#00FF88" />
              <StatCard label="UPGRADES" value={String(stats?.upgradesCollected ?? 0)} color="#FFFF00" />
            </div>
            <button
              onClick={restartGame}
              className="px-8 py-3 font-mono font-bold text-lg rounded-lg bg-[#00FF88]/10 border-2 border-[#00FF88] text-[#00FF88] hover:bg-[#00FF88]/20 transition-all"
            >
              JOGAR NOVAMENTE
            </button>
          </div>
        </div>
      )}

      {/* Mobile Controls */}
      <MobileControls engine={engineRef} />

      {/* Mute button */}
      <button
        onClick={toggleMute}
        className="absolute top-3 right-3 z-30 p-2 rounded-lg bg-black/50 border border-white/10 text-white/50 hover:text-white/80 font-mono text-xs transition-all"
      >
        {isMuted ? '🔇' : '🔊'}
      </button>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="p-3 rounded-lg border font-mono text-center"
      style={{ borderColor: color + '44', background: color + '11' }}
    >
      <div className="text-xs" style={{ color: color + '88' }}>{label}</div>
      <div className="text-xl font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

function MobileControls({ engine }: { engine: React.RefObject<GameEngine | null> }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Detect touch device
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setShow(isTouchDevice);
  }, []);

  if (!show) return null;

  const press = (key: string) => engine.current?.handleKeyDown(key);
  const release = (key: string) => engine.current?.handleKeyUp(key);

  const btnClass = "w-14 h-14 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white/60 text-2xl font-mono active:bg-white/25 select-none";

  return (
    <div className="absolute bottom-6 left-6 z-30">
      <div className="grid grid-cols-3 gap-1">
        <div />
        <button className={btnClass} onTouchStart={() => press('w')} onTouchEnd={() => release('w')}>▲</button>
        <div />
        <button className={btnClass} onTouchStart={() => press('a')} onTouchEnd={() => release('a')}>◀</button>
        <button className={btnClass} onTouchStart={() => press('s')} onTouchEnd={() => release('s')}>▼</button>
        <button className={btnClass} onTouchStart={() => press('d')} onTouchEnd={() => release('d')}>▶</button>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor((seconds ?? 0) / 60);
  const s = Math.floor((seconds ?? 0) % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
