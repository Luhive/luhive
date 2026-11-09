type Props = {
  /** Diameter in px. Everything inside scales from it. */
  size: number;
  color: string;
  topText: string;
  bottomText: string;
  date: string;
};

// A round cancellation mark with straight lines of text, like a machine postmark.
// Inline styles only, and display:flex on every div, so the OG renderer (Satori)
// draws the same mark as the page. Curved text is avoided on purpose: Satori places
// individually rotated letters unevenly.
export function CertificatePostmark({ size, color, topText, bottomText, date }: Props) {
  const ring = Math.max(2, size * 0.016);
  const line = (top: number, fontSize: number, text: string, letterSpacing: number) => (
    <div
      style={{
        position: "absolute",
        left: size * 0.14,
        top,
        width: size * 0.72,
        display: "flex",
        justifyContent: "center",
        fontSize,
        lineHeight: 1,
        letterSpacing,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );

  return (
    <div style={{ position: "relative", display: "flex", width: size, height: size, flexShrink: 0 }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: size,
          height: size,
          display: "flex",
          borderRadius: "50%",
          border: `${ring}px solid ${color}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: size * 0.07,
          top: size * 0.07,
          width: size * 0.86,
          height: size * 0.86,
          display: "flex",
          borderRadius: "50%",
          border: `${ring * 0.5}px dashed ${color}`,
        }}
      />
      {line(size * 0.25, size * 0.078, topText, size * 0.008)}
      <div
        style={{
          position: "absolute",
          left: size * 0.1,
          top: size * 0.4,
          width: size * 0.8,
          height: size * 0.2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderTop: `${ring}px solid ${color}`,
          borderBottom: `${ring}px solid ${color}`,
          color,
          fontSize: size * 0.095,
          letterSpacing: size * 0.004,
          whiteSpace: "nowrap",
        }}
      >
        {date}
      </div>
      {line(size * 0.655, size * 0.058, bottomText, size * 0.004)}
    </div>
  );
}
