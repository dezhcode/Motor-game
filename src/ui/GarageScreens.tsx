import { useState } from "react";
import { garageLevels, type GarageProgress } from "../storage/garageStorage";
import {
  VEHICLES,
  VEHICLE_IDS,
  type VehicleId,
} from "../vehicles/vehicleCatalog";
import {
  MAX_UPGRADE_LEVEL,
  UPGRADE_INFO,
  UPGRADE_PARTS,
  upgradePrice,
  upgradeValue,
  type UpgradePart,
} from "../vehicles/vehicleUpgrades";
import { paintedUrl } from "../artwork/paintedManifest";
import { BitmapSurface, SkinButton } from "./BitmapSurface";
import {
  BitmapIcon,
  ImageMeter,
  bitmapUrl,
  type BitmapIconName,
} from "./BitmapArtwork";
import { ControlCopy, ControlContents } from "./ControlContents";
import { VehiclePreview } from "./VehiclePreview";
const numbers = new Intl.NumberFormat("en-US");
const coin = <img className="menu-coin" src={paintedUrl("coin")} alt="سکه" />;

export function GarageSelection({
  preview,
  progress,
  onPreview,
  onSelect,
  onPurchase,
  onUpgrade,
}: {
  preview: VehicleId;
  progress: GarageProgress;
  onPreview: (id: VehicleId) => void;
  onSelect: () => void;
  onPurchase: () => void;
  onUpgrade: () => void;
}) {
  const vehicle = VEHICLES[preview];
  const owned = progress.owned.includes(preview);
  const selected = progress.selected === preview;
  const missingCoins = Math.max(0, vehicle.price - progress.coins);
  const levels = garageLevels(progress, preview);
  const category = VEHICLE_IDS.filter(
    (id) => VEHICLES[id].kind === vehicle.kind,
  );
  const index = category.indexOf(preview);
  const move = (step: number) =>
    onPreview(category[(index + step + category.length) % category.length]);
  const stats = [
    { label: "قدرت", icon: "engine", part: "engine" },
    { label: "چسبندگی", icon: "wheel", part: "tires" },
    { label: "تعادل", icon: "balance", part: "suspension" },
    { label: "سوخت", icon: "fuel", part: "fuel" },
  ] as const;
  return (
    <div className="garage-main">
      <div className="garage-gallery">
        <div className="garage-filter" role="group" aria-label="نوع وسیله">
          {(["موتور", "ماشین"] as const).map((kind) => (
            <SkinButton
              key={kind}
              className={`metal-button ${vehicle.kind === kind ? "amber" : ""}`}
              aria-pressed={vehicle.kind === kind}
              onClick={() => {
                if (vehicle.kind !== kind)
                  onPreview(
                    VEHICLES[progress.selected].kind === kind
                      ? progress.selected
                      : kind === "موتور"
                        ? "motorcycle"
                        : "jeep",
                  );
              }}
            >
              <ControlContents>
                {kind === "موتور" ? "موتورها" : "ماشین‌ها"}
              </ControlContents>
            </SkinButton>
          ))}
        </div>
        <div className="garage-vehicle-display">
          <SkinButton
            className="metal-button garage-arrow arrow-left"
            aria-label="وسیله قبلی"
            onClick={() => move(-1)}
          >
            <BitmapIcon kind="arrow-left" />
          </SkinButton>
          <VehiclePreview id={preview} garage />
          <SkinButton
            className="metal-button garage-arrow arrow-right"
            aria-label="وسیله بعدی"
            onClick={() => move(1)}
          >
            <BitmapIcon kind="arrow-right" />
          </SkinButton>
        </div>
        <span
          className="garage-position metal-panel"
          role="status"
          aria-label={`وسیلهٔ ${index + 1} از ${category.length}`}
        >
          <BitmapSurface variant="wide" />
          <ControlCopy>
            {index + 1} / {category.length}
          </ControlCopy>
        </span>
        <div className="garage-footer">
          <SkinButton
            className="metal-button amber garage-select"
            disabled={!owned && missingCoins > 0}
            onClick={owned ? onSelect : onPurchase}
          >
            <ControlContents icon={owned ? "check" : undefined}>
              {owned ? "انتخاب" : "خرید وسیله"}
            </ControlContents>
          </SkinButton>
          <SkinButton
            className="metal-button garage-upgrade"
            disabled={!owned}
            onClick={onUpgrade}
          >
            <ControlContents icon="garage">ارتقا</ControlContents>
          </SkinButton>
        </div>
      </div>
      <aside
        className="garage-details metal-panel"
        aria-labelledby="garage-vehicle-name"
      >
        <span className="garage-spec-inlay" aria-hidden="true" />
        <BitmapSurface />
        <div className="garage-detail-header">
          <span className={`ownership-badge ${owned ? "is-owned" : ""}`}>
            <BitmapSurface variant="wide" />
            <BitmapIcon kind={owned ? "check" : "lock"} />
            <ControlCopy>
              {selected ? "انتخاب شده" : owned ? "خریداری شده" : "خریداری نشده"}
            </ControlCopy>
          </span>
          <h2 id="garage-vehicle-name">{vehicle.name}</h2>
          <p>{vehicle.description}</p>
        </div>
        <div className="vehicle-stats">
          <h3>مشخصات وسیله</h3>
          {stats.map(({ label, icon, part }, i) => {
            const rating = Math.min(
              100,
              vehicle.stats[i] + (levels[part] - 1) * 5,
            );
            return (
              <div className="garage-stat" key={part}>
                <BitmapIcon kind={icon} />
                <span className="stat-name">{label}</span>
                <ImageMeter value={rating} label={label} />
                <b className="garage-rating" dir="ltr" aria-hidden="true">
                  {rating}
                  <small>/100</small>
                </b>
              </div>
            );
          })}
        </div>
        {!owned && (
          <div className="garage-price">
            <span>
              {coin}
              <b dir="ltr">{numbers.format(vehicle.price)}</b>
            </span>
            <small>
              {missingCoins
                ? `کسری: ${numbers.format(missingCoins)} سکه`
                : "موجودی کافی است"}
            </small>
          </div>
        )}
      </aside>
    </div>
  );
}

export function VehicleUpgrade({
  id,
  progress,
  onBuy,
  onTest,
}: {
  id: VehicleId;
  progress: GarageProgress;
  onBuy: (part: UpgradePart, level: number) => void;
  onTest: () => void;
}) {
  const [active, setActive] = useState<UpgradePart>("engine");
  const levels = garageLevels(progress, id),
    owned = progress.owned.includes(id);
  const partIcon = (part: UpgradePart) =>
    part === "fuel" ? (
      <img src={bitmapUrl("upgrade-tank")} alt="" />
    ) : (
      <BitmapIcon kind={UPGRADE_INFO[part].icon as BitmapIconName} />
    );
  const percent =
    active === "engine"
      ? 8 * (levels.engine - 1)
      : active === "tires"
        ? 4 * (levels.tires - 1)
        : active === "fuel"
          ? 10 * (levels.fuel - 1)
          : Math.round(2.5 * (levels.suspension - 1));
  return (
    <div className="upgrade-screen">
      <div className="upgrade-showcase">
        <VehiclePreview id={id} garage />
        {UPGRADE_PARTS.map((part) => (
          <SkinButton
            key={part}
            className={`metal-button icon-button upgrade-anchor anchor-${part} ${active === part ? "amber" : ""}`}
            aria-label={`نمایش ${UPGRADE_INFO[part].label}`}
            aria-pressed={active === part}
            onClick={() => setActive(part)}
          >
            <BitmapIcon kind={UPGRADE_INFO[part].icon as BitmapIconName} />
          </SkinButton>
        ))}
        <span className="vehicle-name metal-panel">
          <BitmapSurface variant="wide" />
          <ControlCopy>{VEHICLES[id].name}</ControlCopy>
        </span>
      </div>
      <div className="upgrade-benefit metal-panel" role="status">
        <BitmapSurface variant="wide" />
        <BitmapIcon kind={UPGRADE_INFO[active].icon as BitmapIconName} />
        <strong dir="ltr">+{percent}%</strong>
        <ControlCopy>{UPGRADE_INFO[active].benefit}</ControlCopy>
      </div>
      <SkinButton
        className="metal-button amber upgrade-test"
        disabled={!owned}
        onClick={onTest}
      >
        <ControlContents>آزمایش وسیله</ControlContents>
      </SkinButton>
      <div className="upgrade-grid">
        {UPGRADE_PARTS.map((part) => {
          const info = UPGRADE_INFO[part],
            level = levels[part],
            max = level >= MAX_UPGRADE_LEVEL,
            cost = upgradePrice(part, level);
          const fmt = (value: number) =>
            part === "fuel" ? value.toFixed(1) : numbers.format(value);
          return (
            <section
              key={part}
              className={`upgrade-card metal-panel upgrade-${part}`}
              aria-label={info.label}
            >
              <BitmapSurface />
              <div className="upgrade-part-art">{partIcon(part)}</div>
              <h2>{info.label}</h2>
              <span className="upgrade-level">
                <BitmapSurface variant="wide" />
                <ControlCopy>
                  سطح <b dir="ltr">{level}/8</b>
                </ControlCopy>
              </span>
              <div
                className="upgrade-segments"
                role="meter"
                aria-label={`سطح ${info.label}`}
                aria-valuemin={1}
                aria-valuemax={8}
                aria-valuenow={level}
              >
                {Array.from({ length: 8 }, (_, i) => (
                  <img
                    key={i}
                    src={bitmapUrl(i < level ? "level-on" : "level-off")}
                    alt=""
                    draggable={false}
                  />
                ))}
              </div>
              <div className="upgrade-values" dir="ltr">
                <span>{fmt(upgradeValue(part, level))}</span>
                {!max && (
                  <>
                    <BitmapIcon kind="arrow-right" />
                    <strong>{fmt(upgradeValue(part, level + 1))}</strong>
                  </>
                )}
              </div>
              <SkinButton
                className="metal-button amber upgrade-buy"
                aria-label={`ارتقای ${info.label}`}
                disabled={!owned || max || progress.coins < cost}
                onClick={() => {
                  setActive(part);
                  onBuy(part, level);
                }}
              >
                <span className="control-content">
                  {!max && coin}
                  <ControlCopy>
                    {max ? "تکمیل شد" : numbers.format(cost)}
                  </ControlCopy>
                </span>
              </SkinButton>
            </section>
          );
        })}
      </div>
    </div>
  );
}

const homeAsset = (name: string) =>
  new URL(`./assets/art/home/${name}.webp`, document.baseURI).href;
export function HomeMenu({
  tutorialDone,
  selected,
  onStart,
  onStory,
  onTutorial,
  onGarage,
  onRecords,
}: {
  tutorialDone: boolean;
  selected: VehicleId;
  onStart: () => void;
  onStory: () => void;
  onTutorial: () => void;
  onGarage: () => void;
  onRecords: () => void;
}) {
  return (
    <div className="home-classic">
      <h1 className="home-brand-mark">
        <img src={homeAsset("logo")} alt="کویرسوار" />
        <small>موتورسواری در کویر ایران</small>
      </h1>
      <img
        className="home-hero-art"
        src={homeAsset("hero-jump")}
        alt="موتورسوار کویر در حال پرش"
        draggable={false}
      />
      <button type="button" className="home-route-card metal-panel home-story-entry" onClick={onStory}>
        <BitmapSurface />
        <span>فصل اول</span>
        <strong>جمعه‌های خاکی</strong>
        <small>ورود به حالت داستانی</small>
      </button>
      <SkinButton className="metal-button home-training" onClick={onTutorial}>
        <ControlContents icon="flag">
          {tutorialDone ? "مرور آموزش رانندگی" : "آموزش رانندگی"}
        </ControlContents>
        {tutorialDone && (
          <BitmapIcon className="home-training-check" kind="check" />
        )}
      </SkinButton>
      <div className="home-action-row">
        <SkinButton
          className="metal-button amber home-start"
          aria-label="شروع بازی"
          onClick={onStart}
        >
          <ControlContents icon="play">شروع مسابقه</ControlContents>
        </SkinButton>
        <SkinButton
          className="metal-button"
          aria-label="گاراژ و فروشگاه"
          onClick={onGarage}
        >
          <ControlContents icon="garage">گاراژ</ControlContents>
        </SkinButton>
        <SkinButton className="metal-button" onClick={onRecords}>
          <ControlContents icon="trophy">رکورد من</ControlContents>
        </SkinButton>
      </div>
      <p className="home-ready-note">
        مسیر آماده است؛ با {VEHICLES[selected].name} گاز بده!
      </p>
    </div>
  );
}
