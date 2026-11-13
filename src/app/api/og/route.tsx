import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const title = truncate(
    params.get("title")?.trim() || "Find the repo before it is obvious.",
    120,
  );
  const eyebrow = truncate(params.get("eyebrow")?.trim() || "GitSift · open-source radar", 80);
  const subtitle = truncate(
    params.get("subtitle")?.trim() || "New and rising GitHub repositories, ranked by signal.",
    160,
  );
  const meta = truncate(params.get("meta")?.trim() || "Momentum · quality · freshness", 80);

  const titleSize = title.length > 92 ? 44 : title.length > 64 ? 52 : title.length > 40 ? 60 : 70;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f7f3ea",
          color: "#231f1c",
          padding: "64px 72px 56px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 14,
            height: "100%",
            background: "#c03217",
            display: "flex",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 34 }}>
            <div style={{ width: 5, height: 10, background: "#c03217" }} />
            <div style={{ width: 5, height: 18, background: "#c03217" }} />
            <div style={{ width: 5, height: 25, background: "#c03217" }} />
            <div style={{ width: 5, height: 34, background: "#231f1c" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>GitSift</div>
            <div style={{ fontSize: 14, letterSpacing: 3, color: "#7a7168", marginTop: 2 }}>
              GITSIFT.DEV
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 1000 }}>
          <div
            style={{
              display: "flex",
              fontSize: 16,
              letterSpacing: 3.5,
              textTransform: "uppercase",
              color: "#a4371f",
              marginBottom: 18,
            }}
          >
            {eyebrow}
          </div>
          <div style={{ display: "flex", fontSize: titleSize, fontWeight: 700, lineHeight: 1.06, letterSpacing: -1.4 }}>
            {title}
          </div>
          <div style={{ display: "flex", fontSize: 24, lineHeight: 1.4, color: "#4a423b", marginTop: 22, maxWidth: 900 }}>
            {subtitle}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #d9d0c2",
            paddingTop: 18,
          }}
        >
          <div style={{ display: "flex", fontSize: 15, letterSpacing: 2, textTransform: "uppercase", color: "#7a7168" }}>
            {meta}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                style={{
                  width: 6,
                  height: 6 + step * 6,
                  background: step >= 4 ? "#c03217" : "#d9d0c2",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
