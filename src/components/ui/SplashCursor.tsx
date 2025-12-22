import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './SplashCursor.module.css';

interface Particle {
    id: number;
    x: number;
    y: number;
}

const SplashCursor: React.FC = () => {
    const [particles, setParticles] = useState<Particle[]>([]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // Add a new particle on movement
            const newParticle = {
                id: Date.now() + Math.random(),
                x: e.clientX,
                y: e.clientY,
            };

            setParticles((prev) => [...prev.slice(-20), newParticle]); // Limit trail length
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Cleanup old particles
    useEffect(() => {
        const interval = setInterval(() => {
            setParticles((prev) => prev.filter(p => Date.now() - Math.floor(p.id) < 500));
        }, 100);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className={styles.cursorContainer}>
            <AnimatePresence>
                {particles.map((particle) => (
                    <motion.div
                        key={particle.id}
                        className={styles.particle}
                        initial={{ opacity: 1, scale: 0.5, x: particle.x, y: particle.y }}
                        animate={{ opacity: 0, scale: 2 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        style={{ left: 0, top: 0 }} // Position handled by motion initial
                    />
                ))}
            </AnimatePresence>
        </div>
    );
};

export default SplashCursor;
