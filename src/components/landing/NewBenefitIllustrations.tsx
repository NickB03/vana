import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Shared gradients and definitions
const Defs = () => (
    <defs>
        <linearGradient id="orb-gradient-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="orb-gradient-2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="glow-gradient" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="0.4" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </linearGradient>
        <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
    </defs>
);

const useIntersectionObserver = () => {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => setIsVisible(entry.isIntersecting),
            { threshold: 0.2 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return { ref, isVisible };
};

/**
 * 1. Multi-Model Engine Graphic
 * Concept: Three distinct floating "cores" (models) feeding energy into a central processor.
 */
export const MultiModelGraphic = () => {
    const { ref, isVisible } = useIntersectionObserver();

    return (
        <div
            ref={ref}
            className="relative aspect-video w-full overflow-hidden rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl border border-white/10"
        >
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />

            <svg className="w-full h-full relative z-10" viewBox="0 0 400 300">
                <Defs />

                {/* Connection Lines from Models to Center */}
                {[0, 1, 2].map((i) => (
                    <motion.path
                        key={i}
                        d={`M ${100 + i * 100} 80 C ${100 + i * 100} 150, 200 150, 200 200`}
                        fill="none"
                        stroke="url(#orb-gradient-1)"
                        strokeWidth="2"
                        strokeOpacity="0.3"
                        initial={{ pathLength: 0 }}
                        animate={isVisible ? { pathLength: 1 } : { pathLength: 0 }}
                        transition={{ duration: 1.5, delay: 0.5 + i * 0.3 }}
                    />
                ))}

                {/* Floating AI Models (Top) */}
                {[
                    { color: "#3b82f6", label: "Gemini", x: 100 },
                    { color: "#8b5cf6", label: "GLM-4.7", x: 200 },
                    { color: "#10b981", label: "Air Air", x: 300 }
                ].map((model, i) => (
                    <motion.g
                        key={model.label}
                        initial={{ y: -50, opacity: 0 }}
                        animate={isVisible ? { y: 0, opacity: 1 } : {}}
                        transition={{ delay: i * 0.2, type: "spring" }}
                    >
                        {/* Pulsing Container */}
                        <motion.circle
                            cx={model.x}
                            cy={80}
                            r="24"
                            fill={model.color}
                            fillOpacity="0.1"
                            stroke={model.color}
                            strokeWidth="1"
                            animate={{
                                r: [24, 28, 24],
                                strokeOpacity: [0.5, 1, 0.5]
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                delay: i,
                                ease: "easeInOut"
                            }}
                        />

                        {/* Icon/Core */}
                        <circle cx={model.x} cy={80} r="12" fill={model.color} filter="url(#neon-glow)" />

                        {/* Label */}
                        <text
                            x={model.x}
                            y={120}
                            textAnchor="middle"
                            fill="white"
                            fontSize="10"
                            fontFamily="monospace"
                            className="uppercase tracking-widest opacity-80"
                        >
                            {model.label}
                        </text>
                    </motion.g>
                ))}

                {/* Central Orchestrator (Bottom) */}
                <motion.g
                    initial={{ scale: 0 }}
                    animate={isVisible ? { scale: 1 } : {}}
                    transition={{ delay: 1, type: "spring", bounce: 0.5 }}
                >
                    {/* Hexagon Base */}
                    <path
                        d="M 170 200 L 200 180 L 230 200 L 230 240 L 200 260 L 170 240 Z"
                        fill="url(#orb-gradient-2)"
                        fillOpacity="0.2"
                        stroke="url(#orb-gradient-2)"
                        strokeWidth="2"
                    />

                    {/* Inner Pulse */}
                    <motion.circle
                        cx="200"
                        cy="220"
                        r="10"
                        fill="white"
                        filter="url(#neon-glow)"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1, repeat: Infinity }}
                    />
                </motion.g>

                {/* Data Packets flowing down */}
                {[0, 1, 2].map((i) => (
                    <circle
                        key={`packet-${i}`}
                        r="3"
                        fill="white"
                        filter="url(#neon-glow)"
                    >
                        <animateMotion
                            dur="2s"
                            repeatCount="indefinite"
                            path={`M ${100 + i * 100} 80 C ${100 + i * 100} 150, 200 150, 200 200`}
                        />
                    </circle>
                ))}
            </svg>
        </div>
    );
};

/**
 * 2. Modern Stack Graphic
 * Concept: Isometric layers acting as a platform.
 */
export const StackGraphic = () => {
    const { ref, isVisible } = useIntersectionObserver();

    const layers = [
        { name: "PostgreSQL", color: "#336791", z: 0 },
        { name: "Edge Functions", color: "#3ecf8e", z: 40 },
        { name: "React + Vite", color: "#61dafb", z: 80 },
    ];

    return (
        <div
            ref={ref}
            className="relative aspect-video w-full overflow-hidden rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl border border-white/10"
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(100,100,255,0.1),transparent_70%)]" />

            <svg className="w-full h-full relative z-10" viewBox="0 0 400 300" style={{ transformStyle: 'preserve-3d' }}>
                <Defs />

                <g transform="translate(200, 200)">
                    {layers.map((layer, i) => (
                        <motion.g
                            key={layer.name}
                            initial={{ y: 0, opacity: 0 }}
                            animate={isVisible ? { y: -layer.z, opacity: 1 } : {}}
                            transition={{ delay: i * 0.3, type: "spring", stiffness: 100 }}
                        >
                            {/* Isometric Tile */}
                            <path
                                d="M 0 30 L 80 -10 L 0 -50 L -80 -10 Z"
                                fill={layer.color}
                                fillOpacity="0.2"
                                stroke={layer.color}
                                strokeWidth="2"
                                className="drop-shadow-lg"
                            />
                            {/* Side Panels giving 'thickness' */}
                            <path
                                d="M 0 30 L 80 -10 L 80 -6 L 0 34 Z"
                                fill={layer.color}
                                fillOpacity="0.4"
                            />
                            <path
                                d="M 0 30 L -80 -10 L -80 -6 L 0 34 Z"
                                fill={layer.color}
                                fillOpacity="0.3"
                            />

                            {/* Content Icon/Text on layer */}
                            <text
                                x="0"
                                y="-5"
                                textAnchor="middle"
                                fill="white"
                                className="text-[10px] font-bold tracking-widest uppercase select-none pointer-events-none"
                                style={{ textShadow: `0 2px 4px ${layer.color}` }}
                            >
                                {layer.name}
                            </text>
                        </motion.g>
                    ))}

                    {/* Connecting Beam */}
                    <motion.path
                        d="M 0 -50 L 0 30"
                        stroke="white"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                        strokeOpacity="0.3"
                        initial={{ pathLength: 0 }}
                        animate={isVisible ? { height: 200, opacity: 1 } : {}}
                        className="mix-blend-overlay"
                    />
                </g>

                {/* Floating particles */}
                {[...Array(5)].map((_, i) => (
                    <motion.circle
                        key={i}
                        cx={Math.random() * 400}
                        cy={Math.random() * 300}
                        r={Math.random() * 2}
                        fill="white"
                        fillOpacity="0.5"
                        animate={{
                            y: [0, -20, 0],
                            opacity: [0, 0.8, 0]
                        }}
                        transition={{
                            duration: 3 + Math.random() * 2,
                            repeat: Infinity,
                            delay: Math.random() * 2
                        }}
                    />
                ))}

            </svg>
        </div>
    );
};

/**
 * 3. Enterprise/Production Graphic
 * Concept: A scanning radar or shield interface protecting a globe/network.
 */
export const EnterpriseGraphic = () => {
    const { ref, isVisible } = useIntersectionObserver();

    return (
        <div
            ref={ref}
            className="relative aspect-video w-full overflow-hidden rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl border border-white/10"
        >
            {/* Background Grid */}
            <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
                backgroundSize: '30px 30px'
            }} />

            <svg className="w-full h-full relative z-10" viewBox="0 0 400 300">
                <Defs />

                <g transform="translate(200, 150)">
                    {/* Central Globe/Core */}
                    <circle cx="0" cy="0" r="40" fill="url(#orb-gradient-2)" fillOpacity="0.2" />
                    <circle cx="0" cy="0" r="38" stroke="#10b981" strokeWidth="1" fill="none" opacity="0.5" />

                    {/* Rotating Rings (Shields) */}
                    <motion.g
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    >
                        <path
                            d="M -60 0 A 60 60 0 0 1 60 0"
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="2"
                            strokeLinecap="round"
                            className="drop-shadow-glow"
                        />
                        <path
                            d="M -60 0 A 60 60 0 0 0 60 0"
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="2"
                            strokeOpacity="0.3"
                            strokeLinecap="round"
                        />
                    </motion.g>

                    <motion.g
                        animate={{ rotate: -360 }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    >
                        <circle cx="0" cy="0" r="75" stroke="#8b5cf6" strokeWidth="1" strokeDasharray="10 5" fill="none" opacity="0.6" />
                    </motion.g>

                    {/* Metrics / Info Cards floating around */}
                    {[
                        { label: "SECURE", color: "#10b981", angle: 45 },
                        { label: "CDN", color: "#3b82f6", angle: 160 },
                        { label: "99.9%", color: "#f59e0b", angle: 280 }
                    ].map((item, i) => {
                        const rad = item.angle * (Math.PI / 180);
                        const x = Math.cos(rad) * 110;
                        const y = Math.sin(rad) * 110;

                        return (
                            <motion.g
                                key={item.label}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={isVisible ? { opacity: 1, scale: 1 } : {}}
                                transition={{ delay: 1 + i * 0.4 }}
                            >
                                <line x1="0" y1="0" x2={x * 0.8} y2={y * 0.8} stroke={item.color} strokeWidth="1" strokeOpacity="0.3" />
                                <g transform={`translate(${x}, ${y})`}>
                                    <rect x="-30" y="-12" width="60" height="24" rx="4" fill="#0f172a" stroke={item.color} strokeWidth="1" />
                                    <text x="0" y="4" textAnchor="middle" fill={item.color} fontSize="9" fontWeight="bold">
                                        {item.label}
                                    </text>
                                </g>
                            </motion.g>
                        );
                    })}

                    {/* Scanning Beam */}
                    <motion.path
                        d="M 0 0 L 0 -130 A 130 130 0 0 1 130 0 Z"
                        fill="url(#glow-gradient)"
                        opacity="0.1"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    />
                </g>
            </svg>
        </div>
    );
};
