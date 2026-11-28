import React, { useEffect, useRef, useState } from "react";
import { formatTimeEnglish } from "../storage/bestTimeStorage";
import {
  buyVehicle,
  selectVehicle,
  type GarageProgress,
} from "../storage/garageStorage";
import {
  garageAsset,
  VEHICLES,
  VEHICLE_IDS,
  type VehicleId,
} from "../vehicles/vehicleCatalog";
import { VehiclePreview } from "./VehiclePreview";
import { paintedUrl } from "../artwork/paintedManifest";
import "./garage.css";
import {
  BitmapIcon,
  ImageMeter,
  bitmapUrl,
  preloadButtonStates,
} from "./BitmapArtwork";

export type MenuScreen = "home" | "modes" | "garage" | "records";
interface Props {
  bestTimeMs: number | null;
  tutorialDone: boolean;
  progress: GarageProgress;
  screen: MenuScreen;
  onNavigate: (screen: MenuScreen) => void;
  onProgress: (progress: GarageProgress) => void;
  onStart: () => void;
  onTutorial: () => void;
  onOpenSettings: () => void;
}
const Coin: React.FC = () => (
  <img className="menu-coin" src={paintedUrl("coin")} alt="سکه" />
);
const Icon = BitmapIcon;
const titles: Record<MenuScreen, string> = {
  home: "کویرسوار",
  modes: "انتخاب حالت بازی",
  garage: "گاراژ و فروشگاه",
  records: "رکورد من",
};
const numbers = new Intl.NumberFormat("en-US");
export const StartOverlay: React.FC<Props> = ({
  bestTimeMs,
  tutorialDone,
  progress,
  screen,
  onNavigate,
  onProgress,
  onStart,
  onTutorial,
  onOpenSettings,
}) => {
  const [preview, setPreview] = useState<VehicleId>(progress.selected);
  const [filter, setFilter] = useState<"all" | "motorcycle" | "jeep">("all");
  const [confirming, setConfirming] = useState(false);
  const purchaseDialog = useRef<HTMLDialogElement>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const dialog = purchaseDialog.current;
    if (confirming && dialog && !dialog.open) dialog.showModal();
    else if (!confirming) dialog?.close();
  }, [confirming]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    setPreview(progress.selected);
  }, [progress.selected]);
  useEffect(() => {
    setConfirming(false);
    setNotice("");
  }, [screen, preview]);
  useEffect(() => {
    const back = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (confirming) setConfirming(false);
        else onNavigate("home");
      }
    };
    window.addEventListener("keydown", back);
    return () => window.removeEventListener("keydown", back);
  }, [onNavigate, confirming]);
  useEffect(preloadButtonStates, []);
  const vehicle = VEHICLES[preview],
    owned = progress.owned.includes(preview);
  const choose = () => {
    onProgress(selectVehicle(preview));
    setNotice("وسیله برای مسابقه انتخاب شد");
  };
  const purchase = () => {
    const result = buyVehicle(preview);
    onProgress(result.progress);
    setConfirming(false);
    setNotice(
      result.purchased
        ? "مبارک! جیپ کویر آمادهٔ رانندگی است"
        : "سکه کافی نداری؛ در مسیر سکه جمع کن",
    );
  };
  const move = (step: number) => {
    const i = VEHICLE_IDS.indexOf(preview);
    setPreview(
      VEHICLE_IDS[(i + step + VEHICLE_IDS.length) % VEHICLE_IDS.length],
    );
    setFilter("all");
  };
  return (
    <section
      className={`desert-menu menu-${screen}`}
      aria-label={titles[screen]}
      dir="rtl"
    >
      <img
        className="menu-environment"
        src={
          screen === "garage"
            ? garageAsset("garage-bg-v2")
            : new URL("./assets/art/home/desert.webp", document.baseURI).href
        }
        alt=""
        draggable={false}
      />
      <header className="menu-header">
        <div
          className="menu-wallet metal-panel"
          aria-label={`موجودی ${progress.coins} سکه`}
        >
          <Coin />
          <b dir="ltr">{numbers.format(progress.coins)}</b>
        </div>
        <h1 className="menu-heading metal-panel">{titles[screen]}</h1>
        <div className="menu-header-actions">
          <button
            className="metal-button icon-button"
            onClick={onOpenSettings}
            aria-label="تنظیمات"
          >
            <Icon kind="settings" />
          </button>
          {screen !== "home" && (
            <button
              className="metal-button amber icon-button"
              onClick={() => onNavigate("home")}
              aria-label="بازگشت به خانه"
            >
              <Icon kind="back" />
            </button>
          )}
        </div>
      </header>

      {screen === "home" && (
        <div className="menu-home-content">
          <div className="home-vehicle-display">
            <VehiclePreview id={progress.selected} />
            <span className="vehicle-name metal-panel">
              {VEHICLES[progress.selected].name}
            </span>
          </div>
          <div className="home-journey metal-panel">
            <span className="menu-eyebrow">ماجراجویی در کویر ایران</span>
            <h2>جاده منتظر توست!</h2>
            <p>از تپه‌ها بگذر، سکه جمع کن و وسیلهٔ بعدی را به گاراژت بیاور.</p>
            <div className="journey-route">
              <Icon kind="flag" />
              <div>
                <b>کویر مرکزی</b>
                <span>مسیر اول · تپه‌ها و پل‌های کویری</span>
              </div>
            </div>
            <button
              className="metal-button amber"
              onClick={() => onNavigate("modes")}
            >
              شروع بازی <Icon kind="play" />
            </button>
            <button className="menu-text-button" onClick={onTutorial}>
              {tutorialDone
                ? "مرور آموزش رانندگی"
                : "اولین بارته؟ آموزش رانندگی"}
            </button>
          </div>
        </div>
      )}

      {screen === "modes" && (
        <div className="mode-selection">
          <div className="mode-cards">
            <button
              className="mode-card metal-panel selected-mode"
              onClick={onStart}
            >
              <h2>مرحله‌ای</h2>
              <img
                className="mode-art mode-scene"
                src={bitmapUrl("mode-stage")}
                alt="مسیر تپه‌ای با نشان‌های مرحله"
                draggable={false}
              />
              <b>رسیدن به خط پایان</b>
              <p>کویر مرکزی · مسیر اول</p>
              <span className="metal-button amber">شروع مسیر</span>
            </button>
            <div
              className="mode-card metal-panel unavailable-mode"
              aria-label="نامحدود، به‌زودی"
            >
              <h2>نامحدود</h2>
              <img
                className="mode-art mode-scene"
                src={bitmapUrl("mode-endless")}
                alt="مسیر نامحدود با سکه و نماد بی‌نهایت"
                draggable={false}
              />
              <b>رکورد مسافت</b>
              <p>رانندگی و جمع‌آوری سکه</p>
              <span className="soon-label">به‌زودی</span>
            </div>
            <div
              className="mode-card metal-panel unavailable-mode"
              aria-label="تایمی، به‌زودی"
            >
              <h2>تایمی</h2>
              <img
                className="mode-art mode-scene"
                src={bitmapUrl("mode-timed")}
                alt="کرنومتر و مسیر سکه‌ها"
                draggable={false}
              />
              <b>رقابت با زمان</b>
              <p>ساعت بگیر و بیشتر ادامه بده</p>
              <span className="soon-label">به‌زودی</span>
            </div>
          </div>
          <p className="mode-note">
            وسیلهٔ مسابقه: {VEHICLES[progress.selected].name}
            {!tutorialDone ? " · ابتدا آموزش کوتاه با موتور" : ""}
          </p>
        </div>
      )}

      {screen === "garage" && (
        <>
          <div className="garage-filter" role="group" aria-label="نوع وسیله">
            {(
              [
                ["all", "همه"],
                ["motorcycle", "موتورها"],
                ["jeep", "ماشین‌ها"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                className={`metal-button ${filter === id ? "amber" : ""}`}
                aria-pressed={filter === id}
                onClick={() => {
                  setFilter(id);
                  if (id !== "all") setPreview(id);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="garage-main">
            <div className="garage-vehicle-display">
              <button
                className="metal-button garage-arrow arrow-left"
                onClick={() => move(-1)}
                aria-label="وسیله قبلی"
              >
                <Icon kind="arrow-left" />
              </button>
              <VehiclePreview id={preview} />
              <button
                className="metal-button garage-arrow arrow-right"
                onClick={() => move(1)}
                aria-label="وسیله بعدی"
              >
                <Icon kind="arrow-right" />
              </button>
            </div>
            <aside className="garage-details metal-panel">
              <span className="menu-eyebrow">{vehicle.kind}</span>
              <h2>{vehicle.name}</h2>
              <span className={`ownership-badge ${owned ? "is-owned" : ""}`}>
                {owned
                  ? progress.selected === preview
                    ? "انتخاب شده"
                    : "خریداری شده"
                  : "قابل خرید با سکه"}
              </span>
              <p>{vehicle.description}</p>
              <div className="vehicle-stats">
                {["قدرت", "چسبندگی", "تعادل", "سوخت"].map((label, i) => (
                  <div key={label}>
                    <span className="stat-label">
                      <Icon
                        kind={
                          (["engine", "wheel", "balance", "fuel"] as const)[i]
                        }
                      />
                      {label}
                    </span>
                    <ImageMeter value={vehicle.stats[i]} label={label} />
                  </div>
                ))}
              </div>
            </aside>
          </div>
          <div className="garage-bottom">
            <div className="vehicle-carousel">
              {VEHICLE_IDS.filter(
                (id) => filter === "all" || filter === id,
              ).map((id) => (
                <button
                  key={id}
                  className={`vehicle-card metal-panel ${preview === id ? "is-previewed" : ""}`}
                  aria-pressed={preview === id}
                  onClick={() => setPreview(id)}
                >
                  <VehiclePreview id={id} />
                  <b>{VEHICLES[id].name}</b>
                  <span
                    className={
                      progress.owned.includes(id) ? "owned-tag" : "price-tag"
                    }
                  >
                    {progress.owned.includes(id) ? (
                      progress.selected === id ? (
                        "انتخاب شده"
                      ) : (
                        "خریداری شده"
                      )
                    ) : (
                      <>
                        <Coin />
                        {numbers.format(VEHICLES[id].price)}
                      </>
                    )}
                  </span>
                </button>
              ))}
            </div>
            <div className="garage-purchase-actions">
              {owned ? (
                <button
                  className="metal-button amber"
                  onClick={choose}
                  disabled={progress.selected === preview}
                >
                  {progress.selected === preview
                    ? "انتخاب شده"
                    : "انتخاب وسیله"}
                </button>
              ) : (
                <button
                  className="metal-button amber"
                  onClick={() => setConfirming(true)}
                  disabled={progress.coins < vehicle.price}
                >
                  خرید <Coin />
                  {numbers.format(vehicle.price)}
                </button>
              )}
              <p>
                {!owned && progress.coins < vehicle.price
                  ? `${numbers.format(vehicle.price - progress.coins)} سکه دیگر لازم داری`
                  : "سکه‌ها با رانندگی جمع می‌شوند"}{" "}
              </p>
              {owned && (
                <button
                  className="menu-text-button"
                  onClick={() => {
                    choose();
                    onStart();
                  }}
                >
                  رانندگی با این وسیله <Icon kind="play" />
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {screen === "records" && (
        <div className="records-panel metal-panel">
          <Icon kind="records" />
          <h2>بهترین زمان کویر مرکزی</h2>
          <strong dir="ltr">
            {bestTimeMs === null ? "--:--.--" : formatTimeEnglish(bestTimeMs)}
          </strong>
          <p>
            {bestTimeMs === null
              ? "مسیر را کامل کن و اولین رکوردت را ثبت کن."
              : "هر بار مسیر را سریع‌تر تمام کنی، رکوردت اینجا ثبت می‌شود."}
          </p>
          <button className="metal-button amber" onClick={onStart}>
            شروع مسابقه
          </button>
        </div>
      )}

      <nav className="menu-navigation" aria-label="صفحات بازی">
        {(
          [
            ["home", "خانه", "home"],
            ["modes", "حالت بازی", "flag"],
            ["garage", "گاراژ و فروشگاه", "garage"],
            ["records", "رکورد من", "records"],
          ] as const
        ).map(([page, label, icon]) => (
          <button
            key={page}
            className={`metal-button ${screen === page ? "nav-active" : ""}`}
            aria-current={screen === page ? "page" : undefined}
            onClick={() => onNavigate(page)}
          >
            <Icon kind={icon} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {notice && (
        <div role="status" className="garage-notice metal-panel">
          {notice}
        </div>
      )}
      <dialog
        ref={purchaseDialog}
        aria-labelledby="purchase-title"
        className="garage-confirm metal-panel"
        onCancel={(e) => {
          e.preventDefault();
          setConfirming(false);
        }}
      >
        <h2 id="purchase-title">خرید {vehicle.name}</h2>
        <p>
          این وسیله با <b dir="ltr">{vehicle.price}</b> سکه به گاراژت اضافه شود؟
        </p>
        <div className="btn-row">
          <button autoFocus className="metal-button amber" onClick={purchase}>
            خرید وسیله
          </button>
          <button className="metal-button" onClick={() => setConfirming(false)}>
            انصراف
          </button>
        </div>
      </dialog>
    </section>
  );
};
