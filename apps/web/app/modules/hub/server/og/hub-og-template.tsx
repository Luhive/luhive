import type { HubOgAssets, HubOgSticker, HubOgWeekDay } from "~/modules/hub/model/hub-og-types";
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from "~/shared/lib/og/og-factory";

const SAFE_X = 72;
const INK = "#141414";
const MUTED = "#8c8e9a";
const QUIET = "#c4c6ce";
const SOFT = "#f6f6f6";

const CARD_LEFT = 592;
const CARD_WIDTH = OG_IMAGE_WIDTH - SAFE_X - CARD_LEFT;
const CARD_PADDING = 26;
const COLUMN_WIDTH = (CARD_WIDTH - 8 - CARD_PADDING * 2) / 7;
const STICKER = 54;
const STICKER_RADIUS = 14;
const STICKER_TILTS = [-6, 5, -3, 7, -5, 4, -7, 3, -4, 6, -2, 5];

/** Card height follows the busiest day, so a quiet week reads as compact rather than empty. */
const DAY_HEADER_HEIGHT = 67;
const STICKER_ROW_HEIGHT = 76;
const MIN_STICKER_ROWS = 2;
const CARD_CHROME_HEIGHT = 8 + CARD_PADDING * 2 + 34 + 22;

function measureColumnHeight(days: HubOgWeekDay[]) {
  const rows = Math.max(MIN_STICKER_ROWS, ...days.map((day) => day.stickers.length));
  return DAY_HEADER_HEIGHT + 18 + rows * STICKER_ROW_HEIGHT;
}

function BrandRow({ markSrc }: { markSrc: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <img src={markSrc} width={35} height={35} style={{ width: 35, height: 35 }} />
      <div style={{ display: "flex", fontSize: 34, color: INK, letterSpacing: -1.36, lineHeight: 1 }}>Luhive</div>
    </div>
  );
}

function initials(label: string) {
  return label
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function Sticker({ sticker, tilt }: { sticker: HubOgSticker; tilt: number }) {
  return (
    <div
      style={{
        display: "flex",
        padding: 4,
        borderRadius: 18,
        backgroundColor: "#ffffff",
        transform: `rotate(${tilt}deg)`,
        boxShadow: "0px 10px 18px -8px rgba(20,20,20,0.32)",
      }}
    >
      {sticker.imageSrc ? (
        <img
          src={sticker.imageSrc}
          width={STICKER}
          height={STICKER}
          style={{ width: STICKER, height: STICKER, objectFit: "cover", borderRadius: STICKER_RADIUS }}
        />
      ) : (
        <div
          style={{
            width: STICKER,
            height: STICKER,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: STICKER_RADIUS,
            backgroundColor: SOFT,
            color: MUTED,
            fontSize: 17,
            letterSpacing: -0.5,
          }}
        >
          {initials(sticker.fallbackLabel)}
        </div>
      )}
    </div>
  );
}

function DayColumn({
  day,
  dayIndex,
  tiltOffset,
  height,
}: {
  day: HubOgWeekDay;
  dayIndex: number;
  tiltOffset: number;
  height: number;
}) {
  const hasStickers = day.stickers.length > 0;
  return (
    <div
      style={{
        width: COLUMN_WIDTH,
        height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
        borderLeft: dayIndex === 0 ? "none" : "1px solid #f1f1f3",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", fontSize: 17, color: MUTED }}>{day.weekdayLetter}</div>
        <div
          style={{
            height: 40,
            display: "flex",
            alignItems: "center",
            fontSize: 21,
            letterSpacing: -0.6,
            color: hasStickers ? INK : QUIET,
          }}
        >
          {day.dayOfMonth}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        {day.stickers.map((sticker, index) => (
          <Sticker
            key={sticker.key}
            sticker={sticker}
            tilt={STICKER_TILTS[(tiltOffset + index) % STICKER_TILTS.length]}
          />
        ))}
      </div>
    </div>
  );
}

/** "See what's on this week": event covers land on a calendar card like stickers. */
export function HubOgTemplate({ markSrc, communityCountLabel, days }: HubOgAssets) {
  const source = communityCountLabel ? `from ${communityCountLabel} communities` : "from local communities";
  const tiltOffsets = days.map((_, index) =>
    days.slice(0, index).reduce((total, day) => total + day.stickers.length, 0),
  );
  const columnHeight = measureColumnHeight(days);
  const cardTop = Math.round((OG_IMAGE_HEIGHT - (CARD_CHROME_HEIGHT + columnHeight)) / 2);

  return (
    <div
      style={{
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        display: "flex",
        position: "relative",
        fontFamily: "Geologica",
        backgroundColor: "#ffffff",
      }}
    >
      <div style={{ position: "absolute", left: SAFE_X, top: 72, display: "flex" }}>
        <BrandRow markSrc={markSrc} />
      </div>

      <div
        style={{
          position: "absolute",
          left: SAFE_X,
          top: 200,
          width: 480,
          display: "flex",
          flexDirection: "column",
          gap: 26,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 76,
            color: INK,
            letterSpacing: -3.1,
            lineHeight: 1.04,
          }}
        >
          <div style={{ display: "flex" }}>See what’s on</div>
          <div style={{ display: "flex" }}>this week</div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 28,
            color: MUTED,
            letterSpacing: -0.6,
            lineHeight: 1.35,
          }}
        >
          <div style={{ display: "flex" }}>Meetups, talks and workshops</div>
          <div style={{ display: "flex" }}>{source}</div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: SAFE_X,
          bottom: 64,
          display: "flex",
          fontSize: 22,
          color: "#b3b5bf",
          letterSpacing: -0.2,
        }}
      >
        luhive.com/hub
      </div>

      {/* Hub card shape: a soft grey frame around a white panel. */}
      <div
        style={{
          position: "absolute",
          left: CARD_LEFT,
          top: cardTop,
          width: CARD_WIDTH,
          display: "flex",
          padding: 4,
          borderRadius: 38,
          backgroundColor: SOFT,
          boxShadow: "0px 30px 60px -28px rgba(20,20,20,0.28)",
        }}
      >
        <div
          style={{
            width: CARD_WIDTH - 8,
            display: "flex",
            flexDirection: "column",
            gap: 22,
            padding: CARD_PADDING,
            borderRadius: 34,
            backgroundColor: "#ffffff",
          }}
        >
          <div style={{ display: "flex", fontSize: 28, color: INK, letterSpacing: -1 }}>This week</div>
          <div style={{ display: "flex" }}>
            {days.map((day, dayIndex) => (
              <DayColumn
                key={dayIndex}
                day={day}
                dayIndex={dayIndex}
                tiltOffset={tiltOffsets[dayIndex]}
                height={columnHeight}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
