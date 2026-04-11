import type { TurtleMood } from '@/lib/speech/types';

interface Props {
  mood: TurtleMood;
  size?: number;
}

interface MoodConfig {
  eyeRx: number;
  eyeRy: number;
  leftBrowPath: string;
  rightBrowPath: string;
  mouthPath: string;
  mouthType: 'path' | 'ellipse';
  cssClass: string;
}

const MOOD_CONFIGS: Record<TurtleMood, MoodConfig> = {
  idle: {
    eyeRx: 10,
    eyeRy: 10,
    leftBrowPath: 'M72,68 Q82,65 92,68',
    rightBrowPath: 'M108,68 Q118,65 128,68',
    mouthPath: 'M80,125 Q100,140 120,125',
    mouthType: 'path',
    cssClass: 'mood-idle',
  },
  listening: {
    eyeRx: 11,
    eyeRy: 12,
    leftBrowPath: 'M72,66 Q82,62 92,65',
    rightBrowPath: 'M108,65 Q118,62 128,66',
    mouthPath: 'M82,126 Q100,136 118,126',
    mouthType: 'path',
    cssClass: 'mood-listening',
  },
  talking: {
    eyeRx: 10,
    eyeRy: 7,
    leftBrowPath: 'M72,64 Q82,60 92,64',
    rightBrowPath: 'M108,64 Q118,60 128,64',
    mouthPath: 'M85,122 Q100,138 115,122',
    mouthType: 'path',
    cssClass: 'mood-talking',
  },
  happy: {
    eyeRx: 10,
    eyeRy: 6,
    leftBrowPath: 'M72,62 Q82,56 92,62',
    rightBrowPath: 'M108,62 Q118,56 128,62',
    mouthPath: 'M70,120 Q100,150 130,120',
    mouthType: 'path',
    cssClass: 'mood-happy',
  },
  sad: {
    eyeRx: 10,
    eyeRy: 9,
    leftBrowPath: 'M72,70 Q82,67 92,72',
    rightBrowPath: 'M108,72 Q118,67 128,70',
    mouthPath: 'M80,138 Q100,124 120,138',
    mouthType: 'path',
    cssClass: 'mood-sad',
  },
  confused: {
    eyeRx: 10,
    eyeRy: 10,
    leftBrowPath: 'M72,65 Q82,60 92,68',
    rightBrowPath: 'M108,70 Q118,66 128,68',
    mouthPath: 'M80,130 Q90,122 100,130 Q110,138 120,130',
    mouthType: 'path',
    cssClass: 'mood-confused',
  },
  surprised: {
    eyeRx: 13,
    eyeRy: 13,
    leftBrowPath: 'M72,58 Q82,52 92,58',
    rightBrowPath: 'M108,58 Q118,52 128,58',
    mouthPath: 'M88,122 Q100,142 112,122',
    mouthType: 'path',
    cssClass: 'mood-surprised',
  },
};

export default function TurtleCharacter({ mood, size = 200 }: Props) {
  const cfg = MOOD_CONFIGS[mood];
  const scale = size / 200;

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      aria-label={`Tammy the turtle, feeling ${mood}`}
      className={cfg.cssClass}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* Shell */}
      <ellipse cx="100" cy="115" rx="65" ry="55" fill="#4a7c59" />
      <ellipse cx="100" cy="112" rx="60" ry="50" fill="#5a9469" />
      {/* Shell pattern */}
      <ellipse cx="100" cy="108" rx="28" ry="24" fill="#3d6b4a" opacity="0.6" />
      <ellipse cx="68" cy="118" rx="16" ry="13" fill="#3d6b4a" opacity="0.5" />
      <ellipse cx="132" cy="118" rx="16" ry="13" fill="#3d6b4a" opacity="0.5" />
      <ellipse cx="86" cy="140" rx="14" ry="11" fill="#3d6b4a" opacity="0.4" />
      <ellipse cx="114" cy="140" rx="14" ry="11" fill="#3d6b4a" opacity="0.4" />

      {/* Flippers */}
      <ellipse cx="40" cy="125" rx="20" ry="10" fill="#5a9469" transform="rotate(-20,40,125)" />
      <ellipse cx="160" cy="125" rx="20" ry="10" fill="#5a9469" transform="rotate(20,160,125)" />
      <ellipse cx="65" cy="158" rx="16" ry="8" fill="#5a9469" transform="rotate(15,65,158)" />
      <ellipse cx="135" cy="158" rx="16" ry="8" fill="#5a9469" transform="rotate(-15,135,158)" />

      {/* Head */}
      <ellipse cx="100" cy="75" rx="38" ry="35" fill="#6ab87a" />

      {/* Eyes */}
      <ellipse cx="82" cy="72" rx={cfg.eyeRx} ry={cfg.eyeRy} fill="white" />
      <ellipse cx="118" cy="72" rx={cfg.eyeRx} ry={cfg.eyeRy} fill="white" />
      <circle cx="84" cy="73" r="6" fill="#2c2c2c" />
      <circle cx="120" cy="73" r="6" fill="#2c2c2c" />
      {/* Eye shine */}
      <circle cx="86" cy="71" r="2" fill="white" />
      <circle cx="122" cy="71" r="2" fill="white" />

      {/* Eyebrows */}
      <path d={cfg.leftBrowPath} stroke="#3d6b4a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d={cfg.rightBrowPath} stroke="#3d6b4a" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Mouth */}
      {mood === 'talking' ? (
        <ellipse cx="100" cy="128" rx="12" ry="8" fill="#2c2c2c" className="talk-mouth" />
      ) : mood === 'surprised' ? (
        <ellipse cx="100" cy="128" rx="10" ry="10" fill="#2c2c2c" />
      ) : (
        <path
          d={cfg.mouthPath}
          stroke="#2c2c2c"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
      )}

      {/* Listening indicator: pulsing ring */}
      {mood === 'listening' && (
        <circle
          cx="100"
          cy="100"
          r="90"
          fill="none"
          stroke="rgba(100,200,130,0.4)"
          strokeWidth="6"
          className="pulse-ring"
        />
      )}
    </svg>
  );
}
