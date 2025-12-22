import React from 'react';
import styles from './PrismBackground.module.css';
import '../../styles/animations.css'; // Import global animations

const PrismBackground: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={`${styles.shape} ${styles.shape1}`} />
      <div className={`${styles.shape} ${styles.shape2}`} />
      <div className={`${styles.shape} ${styles.shape3}`} />
      <div className={styles.glassOverlay} />
    </div>
  );
};

export default PrismBackground;
