const CYCLE = "24s";

const STARS = [
  { x: 6,  y: 5,  r: 2,   delay: "0s"   },
  { x: 18, y: 9,  r: 1.5, delay: "0.4s" },
  { x: 30, y: 4,  r: 2.5, delay: "0.9s" },
  { x: 44, y: 8,  r: 1,   delay: "1.3s" },
  { x: 56, y: 3,  r: 2,   delay: "0.2s" },
  { x: 67, y: 10, r: 1.5, delay: "0.7s" },
  { x: 79, y: 6,  r: 2,   delay: "1.1s" },
  { x: 90, y: 4,  r: 1.5, delay: "0.5s" },
  { x: 95, y: 11, r: 1,   delay: "1.5s" },
  { x: 12, y: 18, r: 1.5, delay: "0.8s" },
  { x: 37, y: 20, r: 1,   delay: "1.7s" },
  { x: 51, y: 22, r: 2,   delay: "0.3s" },
  { x: 72, y: 16, r: 1.5, delay: "1.0s" },
  { x: 84, y: 21, r: 1,   delay: "0.6s" },
  { x: 23, y: 26, r: 1,   delay: "1.9s" },
];


export default function Scene() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">

      {/* Sky – Day */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, #38bdf8 0%, #7dd3fc 55%, #bae6fd 100%)",
          animation: `showDay ${CYCLE} ease-in-out infinite`,
        }}
      />

      {/* Sky – Sunset */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, #9333ea 0%, #f97316 40%, #fbbf24 100%)",
          animation: `showSunset ${CYCLE} ease-in-out infinite`,
          opacity: 0,
        }}
      />

      {/* Clouds — PNG asset, drift at varying speeds; night sky covers them naturally */}
      {[
        { top: "6%",  width: "24vw", duration: "70s", delay: "0s",    opacity: 0.85 },
        { top: "14%", width: "17vw", duration: "50s", delay: "-22s",  opacity: 0.70 },
        { top: "4%",  width: "13vw", duration: "40s", delay: "-35s",  opacity: 0.60 },
      ].map((cloud, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src="/assets/white-cloud.png"
          alt=""
          aria-hidden="true"
          className="absolute pointer-events-none"
          style={{
            top: cloud.top,
            left: 0,
            width: cloud.width,
            height: "auto",
            opacity: cloud.opacity,
            animation: `cloudDrift ${cloud.duration} linear infinite`,
            animationDelay: cloud.delay,
          }}
        />
      ))}

      {/* Sky – Night */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, #0f172a 0%, #1e3a5f 60%, #0c4a6e 100%)",
          animation: `showNight ${CYCLE} ease-in-out infinite`,
          opacity: 0,
        }}
      />

      {/* Stars */}
      <div
        className="absolute inset-0"
        style={{ animation: `starsFade ${CYCLE} ease-in-out infinite`, opacity: 0 }}
      >
        {STARS.map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.r * 2,
              height: s.r * 2,
              animation: `twinkle ${2 + (i % 3)}s ease-in-out infinite`,
              animationDelay: s.delay,
            }}
          />
        ))}
      </div>

      {/* Sun */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 70,
          height: 70,
          background: "radial-gradient(circle at 40% 40%, #fef08a, #facc15, #eab308)",
          boxShadow: "0 0 40px 16px rgba(250,204,21,0.5)",
          animation: `sunArc ${CYCLE} ease-in-out infinite`,
          opacity: 0,
        }}
      />

      {/* Moon */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 55,
          height: 55,
          background: "radial-gradient(circle at 35% 35%, #f8fafc, #e2e8f0, #cbd5e1)",
          boxShadow: "0 0 30px 10px rgba(226,232,240,0.35)",
          animation: `moonArc ${CYCLE} ease-in-out infinite`,
          opacity: 0,
        }}
      />


      {/* Ocean */}
      <div className="absolute bottom-0 left-0 right-0" style={{ height: "28vh" }}>
        <div
          style={{
            animation: `waveShift 4s ease-in-out infinite`,
            width: "calc(100% + 80px)",
            marginLeft: -40,
          }}
        >
          <svg
            viewBox="0 0 1440 60"
            preserveAspectRatio="none"
            style={{ display: "block", width: "100%", height: 60 }}
          >
            <path
              d="M0,30 C180,60 360,0 540,30 C720,60 900,0 1080,30 C1260,60 1350,20 1440,30 L1440,60 L0,60 Z"
              fill="#0891b2"
            />
          </svg>
        </div>
        <div
          style={{
            background: "linear-gradient(to bottom, #0891b2, #0e7490, #164e63)",
            marginTop: -2,
            height: "100%",
          }}
        />
      </div>

    </div>
  );
}
