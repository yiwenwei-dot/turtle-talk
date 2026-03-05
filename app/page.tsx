import BottomNav from "./components/BottomNav";
import HomeMessagesStrip from "./components/HomeMessagesStrip";

export default function Home() {
  return (
    <>
      <main
        className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 select-none home-hero"
        style={{
          paddingBottom: "var(--hero-spacing-bottom)",
          gap: "var(--hero-gap)",
        }}
      >
        {/* Turtle mascot */}
        <div
          style={{
            fontSize: 110,
            lineHeight: 1,
            animation: "turtleBob 3s ease-in-out infinite",
            marginBottom: 12,
            filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.25))",
          }}
        >
          🐢
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: "var(--hero-title-size)",
            fontWeight: 900,
            color: "var(--tt-text-primary)",
            textShadow: "var(--hero-title-shadow)",
            letterSpacing: "-0.02em",
            marginBottom: 6,
            textAlign: "center",
          }}
        >
          TurtleTalk
        </h1>

        <p
          style={{
            color: "var(--tt-text-secondary)",
            fontSize: "var(--hero-subtitle-size)",
            marginBottom: 0,
            textAlign: "center",
            fontWeight: 600,
          }}
        >
          Talk to Shelly
        </p>

        <p
          style={{
            color: 'var(--tt-text-muted)',
            fontSize: 'clamp(0.8rem, 2.5vw, 0.95rem)',
            marginBottom: 0,
            textAlign: 'center',
            fontWeight: 500,
          }}
        >
          Your turtle friend is ready to chat 🌿
        </p>

        {/* Messages — one card per message, dismissable, up to 3 */}
        <HomeMessagesStrip />
      </main>

      <BottomNav />
    </>
  );
}
