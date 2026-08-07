'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import StatusButton from './ui/Button/StatusButton';
import styles from './page.module.css';

interface PilotData {
  id: number;
  name: string;
  status: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://10.10.10.25:6225';

export default function PilotDashboard() {
  const [pilot, setPilot] = useState<PilotData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();
  
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const savedPilot = localStorage.getItem('pilot');
    if (savedPilot) setPilot(JSON.parse(savedPilot));
    else router.push('/pilot/login');
  }, [router]);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, []);

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -15;
    const rotateY = ((x - centerX) / centerX) * 15;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
  };

  const handleCardMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
  };

  const updateStatus = async (status: string) => {
    if (!pilot) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/pilots/${pilot.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        setPilot({ ...pilot, status });
        localStorage.setItem('pilot', JSON.stringify({ ...pilot, status }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pilot');
    router.push('/pilot/login');
  };

  if (!pilot) return null;

  return (
    <div className={styles.container}>
      <div className={styles.autoBlob}></div>
      <div 
        className={styles.mouseBlob} 
        style={{ 
          transform: `translate(${mousePosition.x - 250}px, ${mousePosition.y - 250}px)` 
        }}
      ></div>
      <div className={styles.glassOverlay}></div>

      <div className={styles.cardContainer}>
        <div 
          ref={cardRef}
          className={styles.luxCard}
          onMouseMove={handleCardMouseMove}
          onMouseLeave={handleCardMouseLeave}
        >
          <div className={styles.cardHeader}>
            <h2 className={styles.title}>Welcome back,<br/><span>{pilot.name}</span></h2>
            <div className={styles.statusBadge}>
              <span className={styles.ping}></span>
              {pilot.status.replace('_', ' ')}
            </div>
          </div>

          {loading && <p className={styles.loading}>Syncing command...</p>}

          <div className={styles.buttonsGrid}>
            <StatusButton isActive={pilot.status === 'WORKING'} label="Active Duty" type="WORKING" onClick={() => updateStatus('WORKING')} />
            <StatusButton isActive={pilot.status === 'PAUSE_10MIN'} label="Short Break" type="PAUSE_10MIN" onClick={() => updateStatus('PAUSE_10MIN')} />
            <StatusButton isActive={pilot.status === 'PAUSE_1H'} label="Long Break" type="PAUSE_1H" onClick={() => updateStatus('PAUSE_1H')} />
            <StatusButton isActive={pilot.status === 'TOILET'} label="Restroom" type="TOILET" onClick={() => updateStatus('TOILET')} />
            {/* BOUTON DYAL SALAT ZDNAH HNA */}
            <StatusButton isActive={pilot.status === 'PRAYER'} label="Prayer Break" type="PRAYER" onClick={() => updateStatus('PRAYER')} />
          </div>
          
          <button className={styles.logoutBtn} onClick={handleLogout}>Disconnect Terminal</button>
        </div>
      </div>
    </div>
  );
}