import React from 'react';
import styles from './StatusButton.module.css';

interface ButtonProps {
  label: string;
  type: 'WORKING' | 'PAUSE_10MIN' | 'PAUSE_1H' | 'TOILET';
  onClick: () => void;
}

export default function StatusButton({ label, type, onClick }: ButtonProps) {
  return (
    <button className={`${styles.btn} ${styles[type.toLowerCase()]}`} onClick={onClick}>
      {label}
    </button>
  );
}