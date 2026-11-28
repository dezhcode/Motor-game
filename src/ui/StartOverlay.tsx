import { GarageSelection, VehicleUpgrade, HomeMenu } from "./GarageScreens";
import { buyUpgrade } from "../storage/garageStorage";
import type { UpgradePart } from "../vehicles/vehicleUpgrades";
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
  type VehicleId,
} from "../vehicles/vehicleCatalog";
import { paintedUrl } from "../artwork/paintedManifest";
import { BitmapSurface, SkinButton } from "./BitmapSurface";
import { MenuCanvas } from "./MenuCanvas";
import { ControlContents, ControlCopy } from "./ControlContents";
import { BitmapIcon, bitmapUrl, preloadButtonStates } from "./BitmapArtwork";

export type MenuScreen = "home" | "modes" | "garage" | "upgrades" | "records";
interface Props {
  bestTimeMs: number | null;
  tutorialDone: boolean;
  progress: GarageProgress;
  screen: MenuScreen;
  onNavigate: (screen: MenuScreen) => void;
  onProgress: (progress: GarageProgress) => void;
  onStart: () => void;
  onTestVehicle: () => void;
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
  garage: "گاراژ",
  upgrades: "ارتقای وسیله",
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
  onTestVehicle,
  onTutorial,
  onOpenSettings,
}) => {
  const [preview, setPreview] = useState<VehicleId>(progress.selected);
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
        else onNavigate(screen === "upgrades" ? "garage" : "home");
      }
    };
    window.addEventListener("keydown", back);
    return () => window.removeEventListener("keydown", back);
  }, [onNavigate, confirming, screen]);
  useEffect(preloadButtonStates, []);
  const vehicle = VEHICLES[preview];
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
        ? `${vehicle.name} به گاراژ اضافه شد`
        : "سکه کافی نداری؛ در مسیر سکه جمع کن",
    );
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
          screen === "garage" || screen === "upgrades"
            ? garageAsset("garage-bg-v2")
            : new URL("./assets/art/home/desert.webp", document.baseURI).href
        }
        alt=""
        draggable={false}
      />
      <MenuCanvas>
        <header className="menu-header">
          <div
            className="menu-wallet metal-panel"
            aria-label={`موجودی ${progress.coins} سکه`}
          >
            <BitmapSurface />
            <Coin />
            <b dir="ltr">{numbers.format(progress.coins)}</b>
          </div>
          <h1 className="menu-heading metal-panel">
            <BitmapSurface variant="wide" />
            <ControlCopy>{titles[screen]}</ControlCopy>
          </h1>
          <div className="menu-header-actions">
            <SkinButton
              className="metal-button icon-button"
              onClick={onOpenSettings}
              aria-label="تنظیمات"
            >
              <Icon kind="settings" />
            </SkinButton>
            {screen !== "home" && (
              <SkinButton
                className="metal-button amber icon-button"
                onClick={() =>
                  onNavigate(screen === "upgrades" ? "garage" : "home")
                }
                aria-label={
                  screen === "upgrades" ? "بازگشت به گاراژ" : "بازگشت به خانه"
                }
              >
                <Icon kind="back" />
              </SkinButton>
            )}
          </div>
        </header>

        {screen === "home" && (
          <HomeMenu
            tutorialDone={tutorialDone}
            selected={progress.selected}
            onStart={() => onNavigate("modes")}
            onGarage={() => onNavigate("garage")}
            onRecords={() => onNavigate("records")}
            onTutorial={onTutorial}
          />
        )}

        {screen === "modes" && (
          <div className="mode-selection">
            <div className="mode-cards">
              <button
                className="mode-card metal-panel selected-mode"
                onClick={onStart}
              >
                <BitmapSurface />
                <h2>مرحله‌ای</h2>
                <img
                  className="mode-art mode-scene"
                  src={bitmapUrl("mode-stage")}
                  alt="مسیر تپه‌ای با نشان‌های مرحله"
                  draggable={false}
                />
                <b>رسیدن به خط پایان</b>
                <p>کویر مرکزی · مسیر اول</p>
                <span className="mode-state">
                  <ControlCopy>مرحلهٔ ۱ آماده است</ControlCopy>
                </span>
              </button>
              <div
                className="mode-card metal-panel unavailable-mode"
                aria-label="نامحدود، به‌زودی"
              >
                <BitmapSurface />
                <h2>نامحدود</h2>
                <img
                  className="mode-art mode-scene"
                  src={bitmapUrl("mode-endless")}
                  alt="مسیر نامحدود با سکه و نماد بی‌نهایت"
                  draggable={false}
                />
                <b>رکورد مسافت</b>
                <p>رانندگی و جمع‌آوری سکه</p>
                <span className="soon-label">
                  <BitmapSurface variant="wide" />
                  <ControlCopy>به‌زودی</ControlCopy>
                </span>
              </div>
              <div
                className="mode-card metal-panel unavailable-mode"
                aria-label="تایمی، به‌زودی"
              >
                <BitmapSurface />
                <h2>تایمی</h2>
                <img
                  className="mode-art mode-scene"
                  src={bitmapUrl("mode-timed")}
                  alt="کرنومتر و مسیر سکه‌ها"
                  draggable={false}
                />
                <b>رقابت با زمان</b>
                <p>ساعت بگیر و بیشتر ادامه بده</p>
                <span className="soon-label">
                  <BitmapSurface variant="wide" />
                  <ControlCopy>به‌زودی</ControlCopy>
                </span>
              </div>
            </div>
            <p className="mode-note">
              وسیلهٔ مسابقه: {VEHICLES[progress.selected].name}
              {!tutorialDone ? " · ابتدا آموزش کوتاه با موتور" : ""}
            </p>
          </div>
        )}

        {screen === "garage" && (
          <GarageSelection
            preview={preview}
            progress={progress}
            onPreview={setPreview}
            onSelect={() => {
              choose();
              onNavigate("home");
            }}
            onPurchase={() => setConfirming(true)}
            onUpgrade={() => onNavigate("upgrades")}
          />
        )}
        {screen === "upgrades" && (
          <VehicleUpgrade
            id={preview}
            progress={progress}
            onBuy={(part: UpgradePart, level: number) => {
              const result = buyUpgrade(preview, part, level);
              onProgress(result.progress);
              setNotice(
                result.purchased
                  ? "ارتقا انجام شد"
                  : result.reason === "funds"
                    ? "سکه کافی نداری"
                    : "این ارتقا انجام شده است",
              );
            }}
            onTest={() => {
              choose();
              onTestVehicle();
            }}
          />
        )}

        {screen === "records" && (
          <div className="records-panel metal-panel">
            <BitmapSurface />
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
            <SkinButton className="metal-button amber" onClick={onStart}>
              <ControlContents icon="play">شروع مسابقه</ControlContents>
            </SkinButton>
          </div>
        )}

        <nav className="menu-navigation" aria-label="صفحات بازی">
          {(
            [
              ["home", "خانه", "home"],
              ["modes", "حالت بازی", "flag"],
              ["garage", "گاراژ", "garage"],
              ["records", "رکورد من", "records"],
            ] as const
          ).map(([page, label, icon], i) => (
            <React.Fragment key={page}>
              <SkinButton
                className={`metal-button ${screen === page ? "nav-active" : ""}`}
                aria-label={page === "garage" ? "گاراژ و فروشگاه" : label}
                aria-current={screen === page ? "page" : undefined}
                onClick={() => onNavigate(page)}
              >
                <ControlContents icon={icon}>{label}</ControlContents>
              </SkinButton>
              {screen === "modes" && i === 1 && (
                <SkinButton
                  className="metal-button amber mode-continue"
                  onClick={onStart}
                >
                  <ControlContents>شروع مسیر</ControlContents>
                </SkinButton>
              )}
            </React.Fragment>
          ))}
        </nav>
        {notice && (
          <div role="status" className="garage-notice metal-panel">
            <BitmapSurface />
            {notice}
          </div>
        )}
      </MenuCanvas>
      <dialog
        ref={purchaseDialog}
        aria-labelledby="purchase-title"
        className="garage-confirm metal-panel"
        onCancel={(e) => {
          e.preventDefault();
          setConfirming(false);
        }}
      >
        <BitmapSurface />
        <h2 id="purchase-title">خرید {vehicle.name}</h2>
        <p>
          این وسیله با <b dir="ltr">{vehicle.price}</b> سکه به گاراژت اضافه شود؟
        </p>
        <div className="btn-row">
          <SkinButton
            autoFocus
            className="metal-button amber"
            onClick={purchase}
          >
            <ControlContents>خرید وسیله</ControlContents>
          </SkinButton>
          <SkinButton
            className="metal-button"
            onClick={() => setConfirming(false)}
          >
            <ControlContents>انصراف</ControlContents>
          </SkinButton>
        </div>
      </dialog>
    </section>
  );
};
