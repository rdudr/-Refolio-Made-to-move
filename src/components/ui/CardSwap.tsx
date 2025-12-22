import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './CardSwap.module.css';

interface CardSwapProps {
    activeCardKey: string;
    children: React.ReactNode;
}

const CardSwap: React.FC<CardSwapProps> = ({ activeCardKey, children }) => {
    return (
        <div className={styles.container}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeCardKey}
                    className={styles.cardWrapper}
                    initial={{ opacity: 0, x: 20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -20, scale: 0.95 }}
                    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                >
                    {children}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default CardSwap;
