import React from 'react';
import styles from './Header.module.css';

interface HeaderProps {
  total: number;
  working: number;
  paused: number;
}

export default function Header({ total, working, paused }: HeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.titleSection}>
        <h1 className={styles.title}>System Overview</h1>
        <p className={styles.subtitle}>Real-time orbital tracking activated.</p>
      </div>
      
      <div className={styles.statsContainer}>
        <div className={styles.statBox}>
          <div className={styles.statIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Fleet Total</span>
            <span className={styles.statValue}>{total}</span>
          </div>
        </div>

        <div className={`${styles.statBox} ${styles.working}`}>
          <div className={styles.statIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Active Duty</span>
            <span className={styles.statValue}>{working}</span>
          </div>
        </div>

        <div className={`${styles.statBox} ${styles.paused}`}>
          <div className={styles.statIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Standby</span>
            <span className={styles.statValue}>{paused}</span>
          </div>
        </div>
      </div>
    </div>
  );
}