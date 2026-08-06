import React from 'react';
import styles from './StatusButton.module.css';

interface ButtonProps {
  label: string;
  type: 'WORKING' | 'PAUSE_10MIN' | 'PAUSE_1H' | 'TOILET';
  isActive: boolean;
  onClick: () => void;
}

export default function StatusButton({ label, type, isActive, onClick }: ButtonProps) {
  // L'class mbedla 3la 7sab type w wach hada houwa l'status l'actuel wla la
  const buttonClass = `${styles.btn} ${styles[type.toLowerCase()]} ${isActive ? styles.activeStatus : ''}`;

  return (
    <button className={buttonClass} onClick={onClick}>
      <span className={styles.btnContent}>{label}</span>
      <div className={styles.glowEffect}></div>
    </button>
  );
}