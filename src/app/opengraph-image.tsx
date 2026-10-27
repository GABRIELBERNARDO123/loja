import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Loja de produtos digitais premium";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #07070b 0%, #12101c 55%, #1a0d1a 100%)",
          padding: "70px",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "linear-gradient(135deg, #f4315b, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 800,
            }}
          >
            V
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 26, fontWeight: 700 }}>Vértice Digital</span>
            <span style={{ fontSize: 14, letterSpacing: 5, color: "#8b8ba3" }}>PRODUTOS DIGITAIS</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 800, lineHeight: 1.05, maxWidth: 900 }}>
            Arquivos que economizam horas do seu trabalho.
          </div>
          <div style={{ display: "flex", marginTop: 26, fontSize: 26, color: "#b9b9cc" }}>
            Pagamento via Pix · Entrega automática · Download protegido
          </div>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          {["Planilhas", "Documentos", "Materiais profissionais"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 999,
                padding: "12px 24px",
                fontSize: 20,
                color: "#e6e6f0",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
