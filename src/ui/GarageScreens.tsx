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
  const vehicle = VEHICLES[preview],
    owned = progress.owned.includes(preview),
    levels = garageLevels(progress, preview);
  const move = (step: number) =>
    onPreview(
      VEHICLE_IDS[
        (VEHICLE_IDS.indexOf(preview) + step + VEHICLE_IDS.length) %
          VEHICLE_IDS.length
      ],
    );
  const stats = vehicle.stats.map((value, i) =>
    Math.min(
      100,
      value +
        (levels[(["engine", "tires", "suspension", "fuel"] as const)[i]] - 1) *
          5,
    ),
  );
  return (
    <>
      <div className="garage-filter" role="group" aria-label="نوع وسیله">
        {(["موتور", "ماشین"] as const).map((kind) => (
          <SkinButton
            key={kind}
            className={`metal-button ${vehicle.kind === kind ? "amber" : ""}`}
            aria-pressed={vehicle.kind === kind}
            onClick={() => onPreview(kind === "موتور" ? "motorcycle" : "jeep")}
          >
            <ControlContents>
              {kind === "موتور" ? "موتورها" : "ماشین‌ها"}
            </ControlContents>
          </SkinButton>
        ))}
      </div>
      <div className="garage-main">
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
        <aside className="garage-details metal-panel">
          <BitmapSurface />
          <h2>{vehicle.name}</h2>
          <span className={`ownership-badge ${owned ? "is-owned" : ""}`}>
            <BitmapSurface variant="wide" />
            <ControlCopy>
              {owned ? "خریداری شده" : "قابل خرید با سکه"}
            </ControlCopy>
            {owned && <BitmapIcon kind="check" />}
          </span>
          <div className="vehicle-stats">
            {["قدرت", "چسبندگی", "تعادل", "سوخت"].map((label, i) => (
              <div key={label}>
                <span className="stat-name">{label}</span>
                <ImageMeter value={stats[i]} label={label} />
                <BitmapIcon
                  kind={(["engine", "wheel", "balance", "fuel"] as const)[i]}
                />
              </div>
            ))}
          </div>
        </aside>
      </div>
      <div className="garage-bottom">
        <div className="vehicle-carousel">
          {VEHICLE_IDS.map((id) => (
            <button
              key={id}
              className={`vehicle-card metal-panel ${preview === id ? "is-previewed" : ""}`}
              aria-label={`نمایش ${VEHICLES[id].name}`}
              aria-pressed={preview === id}
              onClick={() => onPreview(id)}
            >
              <BitmapSurface />
              <VehiclePreview id={id} garage />
              <span
                className={
                  progress.owned.includes(id) ? "owned-tag" : "price-tag"
                }
              >
                <BitmapSurface variant="wide" />
                {progress.owned.includes(id) ? (
                  <ControlCopy>
                    {progress.selected === id ? "انتخاب شده" : "خریداری شده"}
                  </ControlCopy>
                ) : (
                  <>
                    {id === "buggy" && <BitmapIcon kind="lock" />}
                    {coin}
                    <ControlCopy>
                      {numbers.format(VEHICLES[id].price)}
                    </ControlCopy>
                  </>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="garage-footer">
        <SkinButton
          className="metal-button amber garage-select"
          disabled={!owned && progress.coins < vehicle.price}
          onClick={owned ? onSelect : onPurchase}
        >
          <ControlContents>
            {owned ? "انتخاب" : `خرید · ${numbers.format(vehicle.price)}`}
          </ControlContents>
        </SkinButton>
        <SkinButton
          className="metal-button garage-upgrade"
          disabled={!owned}
          onClick={onUpgrade}
        >
          <ControlContents>ارتقا</ControlContents>
        </SkinButton>
      </div>
    </>
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
  onTutorial,
  onGarage,
  onRecords,
}: {
  tutorialDone: boolean;
  selected: VehicleId;
  onStart: () => void;
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
      <div className="home-route-card metal-panel">
        <BitmapSurface />
        <span>مسیر اول</span>
        <strong>کویر مرکزی</strong>
        <small>تپه‌ها و پل‌های کویری</small>
      </div>
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
