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
  dailyPauseTime: number; 
}

interface PilotLog {
  id: number;
  status: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
}

export default function AdminDashboard() {
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  const [selectedPilot, setSelectedPilot] = useState<Pilot | null>(null);
  const [pilotLogs, setPilotLogs] = useState<PilotLog[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [editForm, setEditForm] = useState({ name: '', username: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ⚠️ THE FIX: Production Ready (Kay-9ra mn Docker awla .env)
  const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

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
    
    fetch(`${API_URL}/api/v1/pilots`)
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

  const openPilotDetails = async (pilot: Pilot) => {
    setSelectedPilot(pilot);
    setIsEditing(false); 
    setEditForm({ name: pilot.name, username: '', password: '' }); 
    setIsModalOpen(true);
    
    try {
      const res = await fetch(`${API_URL}/api/v1/pilots/${pilot.id}/logs`);
      if (res.ok) {
        const data = await res.json();
        setPilotLogs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePilot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPilot) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/v1/pilots/${selectedPilot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        const updatedPilot = await response.json();
        setPilots((prev) => prev.map((p) => (p.id === updatedPilot.id ? updatedPilot : p)));
        setSelectedPilot(updatedPilot);
        setIsEditing(false);
        alert('Pilot updated successfully!');
      } else {
        const errorText = await response.text();
        alert(`Error updating pilot: ${errorText}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error while updating.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePilot = async () => {
    if (!selectedPilot) return;
    
    const confirmDelete = window.confirm(`Are you sure you want to permanently delete ${selectedPilot.name}? This action cannot be undone.`);
    if (!confirmDelete) return;

    try {
      const response = await fetch(`${API_URL}/api/v1/pilots/${selectedPilot.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPilots((prev) => prev.filter((p) => p.id !== selectedPilot.id));
        setIsModalOpen(false);
      } else {
        alert('Error deleting pilot.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) return `${m}min ${s}s`;
    return `${s}s`;
  };

  const getStats = () => {
    let toiletCount = 0, toiletTime = 0;
    let shortCount = 0, shortTime = 0;
    let longCount = 0, longTime = 0;
    let prayerCount = 0, prayerTime = 0;

    pilotLogs.forEach(log => {
      if(log.status === 'TOILET') { toiletCount++; toiletTime += log.durationSeconds; }
      if(log.status === 'PAUSE_10MIN') { shortCount++; shortTime += log.durationSeconds; }
      if(log.status === 'PAUSE_1H') { longCount++; longTime += log.durationSeconds; }
      if(log.status === 'PRAYER') { prayerCount++; prayerTime += log.durationSeconds; }
    });

    return { toiletCount, toiletTime, shortCount, shortTime, longCount, longTime, prayerCount, prayerTime };
  };

  if (!isAuthenticated) return null;

  const total = pilots.length;
  const working = pilots.filter(p => p.status === 'WORKING').length;
  const paused = total - working;
  const stats = getStats();

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
                <div 
                  key={pilot.id} 
                  className={styles.cardWrapper} 
                  onClick={() => openPilotDetails(pilot)}
                  style={{ cursor: 'pointer' }}
                >
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

      {isModalOpen && selectedPilot && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>✕</button>
            
            <div className={styles.modalHeader}>
              <h2 style={{ margin: 0 }}>
                {isEditing ? `Edit Pilot: ${selectedPilot.name}` : `Activity: ${selectedPilot.name}`}
              </h2>
              <div className={styles.actionButtons}>
                {!isEditing ? (
                  <>
                    <button className={styles.editBtn} onClick={() => setIsEditing(true)}>Edit</button>
                    <button className={styles.deleteBtn} onClick={handleDeletePilot}>Delete</button>
                  </>
                ) : (
                  <button className={styles.cancelBtn} onClick={() => setIsEditing(false)}>Cancel</button>
                )}
              </div>
            </div>

            {isEditing ? (
              <form onSubmit={handleUpdatePilot} className={styles.editForm}>
                <div className={styles.formGroup}>
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    value={editForm.name} 
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    placeholder="Enter new name"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>New Username (Optional)</label>
                  <input 
                    type="text" 
                    value={editForm.username} 
                    onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                    placeholder="Leave blank to keep current"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>New Password (Optional)</label>
                  <input 
                    type="password" 
                    value={editForm.password} 
                    onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                    placeholder="Leave blank to keep current"
                  />
                </div>
                <button type="submit" className={styles.saveBtn} disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            ) : (
              <>
                <div className={styles.statsGrid}>
                  <div className={styles.statBox}>
                    <h4>Short Break</h4>
                    <p>{stats.shortCount} times</p>
                    <p style={{fontSize: '0.8rem', color: '#a4b0be'}}>{formatDuration(stats.shortTime)} Total</p>
                  </div>
                  <div className={styles.statBox}>
                    <h4>Long Break</h4>
                    <p>{stats.longCount} times</p>
                    <p style={{fontSize: '0.8rem', color: '#a4b0be'}}>{formatDuration(stats.longTime)} Total</p>
                  </div>
                  <div className={styles.statBox}>
                    <h4>Restroom</h4>
                    <p>{stats.toiletCount} times</p>
                    <p style={{fontSize: '0.8rem', color: '#a4b0be'}}>{formatDuration(stats.toiletTime)} Total</p>
                  </div>
                  <div className={styles.statBox}>
                    <h4>Prayer</h4>
                    <p>{stats.prayerCount} times</p>
                    <p style={{fontSize: '0.8rem', color: '#a4b0be'}}>{formatDuration(stats.prayerTime)} Total</p>
                  </div>
                </div>

                <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginTop: '20px' }}>
                  Detailed History
                </h3>
                
                <div className={styles.logsList}>
                  {pilotLogs.length === 0 ? (
                    <p style={{textAlign: 'center', color: '#a4b0be'}}>No activities recorded today.</p>
                  ) : (
                    pilotLogs.map((log) => (
                      <div key={log.id} className={styles.logItem}>
                        <div>
                          <strong>{log.status.replace('_', ' ')}</strong>
                          <div style={{fontSize: '0.8rem', color: '#a4b0be', marginTop: '4px'}}>
                            {new Date(log.startTime).toLocaleTimeString()} - {new Date(log.endTime).toLocaleTimeString()}
                          </div>
                        </div>
                        <div style={{fontWeight: 'bold', color: '#1dd1a1'}}>
                          {formatDuration(log.durationSeconds)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}