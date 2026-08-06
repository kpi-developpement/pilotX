import React, { useRef } from 'react';
import styles from './Card1.module.css';

interface CardProps {
  name: string;
  status: string;
  lastUpdated: string;
  dailyPauseTime: number;
}

export default function Card1({ name, status, lastUpdated, dailyPauseTime }: CardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null); // Glare Effect!

  const formatTime = (isoString: string) => {
    if (!isoString) return 'Now';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatPauseDuration = (seconds: number) => {
    if (!seconds || seconds === 0) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const getStatusClass = () => {
    switch (status) {
      case 'WORKING': return styles.statusWorking;
      case 'PAUSE_10MIN': return styles.statusPause10;
      case 'PAUSE_1H': return styles.statusPause1h;
      case 'TOILET': return styles.statusToilet;
      default: return '';
    }
  };

  // 3D TILT + GLARE EFFECT
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !glareRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    
    // Position dyal l'souris wste l'carte
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calcul dyal Tilt 3D
    const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -12;
    const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 12;

    // Calcul dyal chou3a3 (Glare position f'CSS variables)
    const px = (x / rect.width) * 100;
    const py = (y / rect.height) * 100;

    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.04, 1.04, 1.04)`;
    glareRef.current.style.background = `radial-gradient(circle at ${px}% ${py}%, rgba(255,255,255,0.4) 0%, transparent 50%)`;
    glareRef.current.style.opacity = '1';
  };

  const handleMouseLeave = () => {
    if (!cardRef.current || !glareRef.current) return;
    cardRef.current.style.transform = `rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    glareRef.current.style.opacity = '0'; // Tkhba chou3a3
  };

  return (
    <div 
      ref={cardRef}
      className={`${styles.card} ${getStatusClass()}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles.glowBg}></div>
      <div ref={glareRef} className={styles.glare}></div> {/* Hna kiban ddo */}

      <div className={styles.cardContent}>
        <div className={styles.cardTop}>
          <div className={styles.avatar}>{name.charAt(0).toUpperCase()}</div>
          <div className={styles.statusIndicator}><div className={styles.ping}></div></div>
        </div>
        
        <div className={styles.cardBody}>
          <h3 className={styles.name}>{name}</h3>
          <span className={styles.badge}>{status.replace('_', ' ')}</span>
        </div>

        <div className={styles.cardFooter}>
          <div className={styles.footerItem}>
            {/* Clock SVG (Bdelna Emoji) */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>{formatTime(lastUpdated)}</span>
          </div>
          
          <div className={styles.pausePill}>
            {/* Pause SVG (Bdelna Emoji) */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
            <span>Pause:</span>
            <strong>{formatPauseDuration(dailyPauseTime)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}