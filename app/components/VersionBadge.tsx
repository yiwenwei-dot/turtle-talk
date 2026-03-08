import pkg from "../../package.json";

const currentYear = new Date().getFullYear();

export default function VersionBadge() {
  const displayVersion = `v${pkg.version.split(".")[0] || pkg.version}`;

  return (
    <div
      className="version-badge fixed bottom-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
      style={{
        fontSize: "0.65rem",
        fontWeight: 600,
        color: "rgba(255,255,255,0.5)",
        letterSpacing: "0.05em",
        userSelect: "none",
        textAlign: "center",
      }}
    >
      © {currentYear} · {displayVersion}
    </div>
  );
}
