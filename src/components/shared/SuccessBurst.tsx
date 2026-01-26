/**
 * Zhuzh Success Burst Animation
 * 
 * A celebratory sparkle burst for successful actions (approve, submit, save).
 * Uses Framer Motion for smooth animations.
 * 
 * Usage:
 *   import { SuccessBurst } from './SuccessBurst';
 *   
 *   // Trigger on success
 *   const [showBurst, setShowBurst] = useState(false);
 *   
 *   const handleApprove = async () => {
 *     await approveTimesheet();
 *     setShowBurst(true);
 *     setTimeout(() => setShowBurst(false), 600);
 *   };
 *   
 *   return (
 *     <Button onClick={handleApprove}>
 *       Approve
 *       {showBurst && <SuccessBurst />}
 *     </Button>
 *   );
 */

import { motion } from 'framer-motion';

interface SparkleProps {
  color: string;
  angle: number;
  distance: number;
}

const ZhuzhSparkle = ({ color, angle, distance }: SparkleProps) => {
  const sparklePath = "M10 2C10 6.41828 6.41828 10 2 10C6.41828 10 10 13.5817 10 18C10 13.5817 13.5817 10 18 10C13.5817 10 10 6.41828 10 2Z";

  return (
    <motion.svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      style={{ position: 'absolute', left: '50%', top: '50%', pointerEvents: 'none' }}
      initial={{ scale: 0, x: -10, y: -10, opacity: 1, rotate: 0 }}
      animate={{
        scale: [0, 1, 0],
        x: Math.cos(angle) * distance - 10,
        y: Math.sin(angle) * distance - 10,
        rotate: 45,
        opacity: [1, 1, 0]
      }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <path
        d={sparklePath}
        fill={color}
        stroke="#33332F"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
};

export const SuccessBurst = () => {
  const particles = [
    { color: '#FF8731', angle: -0.5, distance: 40 },  // Orange - Top Rightish
    { color: '#FFF845', angle: 3.14, distance: 35 },  // Yellow - Left
    { color: '#80FF9C', angle: 1.2, distance: 45 },   // Lime - Bottom
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div style={{ position: 'absolute', left: '50%', top: '50%' }}>
          {particles.map((p, i) => (
            <ZhuzhSparkle key={i} {...p} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SuccessBurst;
