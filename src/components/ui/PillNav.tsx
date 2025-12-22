import React from 'react';
import styles from './PillNav.module.css';
import '../../styles/glassmorphic.css'; // Ensure glass utilities are available

interface PillNavProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    tabs: { id: string; label: string }[];
}

const PillNav: React.FC<PillNavProps> = ({ activeTab, onTabChange, tabs }) => {
    return (
        <nav className={`${styles.navContainer} glass-panel`}>
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    className={`${styles.navItem} ${activeTab === tab.id ? styles.active : ''}`}
                    onClick={() => onTabChange(tab.id)}
                >
                    {tab.label}
                    <div className={styles.indicator} />
                </button>
            ))}
        </nav>
    );
};

export default PillNav;
