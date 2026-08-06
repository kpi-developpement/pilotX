'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../composant/Sidebar/Sidebar';
import Header from '../composant/Header/Header';
import Card1 from './ui/Card/Card1';
import { createWebSocketClient } from '../../services/websocketService';
import styles from './page.module.css';

interface Pilot {
  id: number;
  name: string;
  status: string;
  lastUpdated: string;
  dailyPauseTime: number; // Zdnaha hna
}

export default function AdminDashboard() {
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  // Protect Route
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    fetch(process.env.NEXT_PUBLIC_API_URL + '/api/v1/pilots')
      .then((res) => res.json())
      .then((data) => setPilots(data))
      .catch((err) => console.error(err));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const client = createWebSocketClient((updatedPilot: Pilot) => {
      setPilots((prev) => {
        const exists = prev.find((p) => p.id === updatedPilot.id);
        if (exists) {
          return prev.map((p) => (p.id === updatedPilot.id ? updatedPilot : p));
        }
        return [...prev, updatedPilot];
      });
    });

    client.activate();
    return () => { client.deactivate(); };
  }, [isAuthenticated]);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, []);

  if (!isAuthenticated) return null; // Bach may-flashish dashboard 9bel redirect

  const total = pilots.length;
  const working = pilots.filter(p => p.status === 'WORKING').length;
  const paused = total - working;

  return (
    <div className={styles.layout}>
      <div className={styles.autoBlob}></div>
      <div 
        className={styles.mouseBlob} 
        style={{ transform: `translate(${mousePosition.x - 300}px, ${mousePosition.y - 300}px)` }}
      ></div>
      <div className={styles.glassOverlay}></div>

      <div className={styles.contentWrapper}>
        <Sidebar />
        <main className={styles.mainContent}>
          <div className={styles.dashboardContainer}>
            <Header total={total} working={working} paused={paused} />
            
            <div className={styles.grid}>
              {pilots.map((pilot) => (
                <div key={pilot.id} className={styles.cardWrapper}>
                  <Card1
                    name={pilot.name}
                    status={pilot.status}
                    lastUpdated={pilot.lastUpdated}
                    dailyPauseTime={pilot.dailyPauseTime}
                  />
                </div>
              ))}
              {pilots.length === 0 && (
                <div className={styles.emptyState}>
                  <div className={styles.emptyGlow}></div>
                  <p>No pilots registered yet. Awaiting signals...</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}