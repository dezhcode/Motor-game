# کویرسوار (KavirSavar) — نمونهٔ اولیه

نمونهٔ اولیهٔ بازی موتورسواری دوبعدی در کویر ایران با فیزیک واقعی، چیدمان تمام‌افقی (Landscape)، کنترل لمسی چندنقطه‌ای و پشتیبانی از خروجی وب و Android APK (بدون نیاز به اینترنت، CDN یا سرور خارجی).

---

## ۱. اجرای پروژه (پیش‌نمایش وب)

نیازمندی‌ها: **Node.js 20+** (پیشنهادی: 22) و **npm**.

```bash
npm install
npm run dev
```

سپس آدرس محلی Vite را در مرورگر دسکتاپ یا موبایل باز کنید.  
برای بررسی TypeScript، اجرای تست‌های فیزیک و ساخت خروجی تولید:

```bash
npm run typecheck
npm run test:physics
npm run build
```

---

## ۲. ساخت خروجی Android APK

پروژه هم از **Capacitor Android** در پوشهٔ `android/` و هم از پروژهٔ Gradle ریشه (`app/`) برای اجرای آفلاین در پیش‌نمایش اندروید پشتیبانی می‌کند.

### ساخت با Capacitor (محلی یا CI):

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

فایل APK آزمایشی در مسیر زیر ساخته می‌شود:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

### همگام‌سازی بسته‌های آفلاین با پروژهٔ Gradle ریشه:

```bash
npm run build:android-assets
gradle :app:assembleDebug
```

### GitHub Actions

فایل workflow آماده در مسیر `.github/workflows/android-apk.yml` قرار دارد که در هر push روی `main`/`master` یا اجرای دستی (`workflow_dispatch`):
1. وابستگی‌های npm را نصب می‌کند (`npm ci`)
2. بررسی TypeScript و تست‌های فیزیک را اجرا می‌کند
3. خروجی وب Vite را می‌سازد (`npm run build`)
4. پروژهٔ اندروید Capacitor را همگام‌سازی می‌کند (`npx cap sync android`)
5. APK آزمایشی (`assembleDebug`) را می‌سازد و به‌عنوان artifact با نام `kavirsavar-debug-apk` آپلود می‌کند.

---

## ۳. ساختار فایل‌ها و ماژول‌ها

```text
src/
├── config/
│   ├── physicsConfig.ts      # تمام پارامترهای متمرکز فیزیک موتور، چرخ، تعلیق و شکست
│   └── palette.ts            # پالت رنگ کویر ایران و قطعات موتور و راننده
├── physics/
│   └── PhysicsWorld.ts       # شبیه‌ساز Planck.js (گام ثابت 1/60، interpolation، WheelJoint، برخوردها)
├── bike/
│   └── BikeRig.ts            # رندر قطعات مجزای موتور و راننده در PixiJS (آمادهٔ جایگزینی با PNG/WebP)
├── track/
│   ├── desertTrackData.ts    # داده‌های مسیر دست‌ساز ۳۵ تا ۵۰ ثانیه‌ای با رمپ‌ها و خط پایان
│   └── TrackBuilder.ts       # رندر ۳ لایه پارالاکس کویر، کلوت‌ها، کوه‌های محو و سطح زمین
├── camera/
│   └── FollowCamera.ts       # دوربین نرم با پیش‌نگری مسیر و تطبیق نسبت 1280×720
├── input/
│   └── InputManager.ts       # مدیریت Pointer Events مستقل (چندلمسی) و صفحه‌کلید
├── effects/
│   └── DustAndAudio.ts       # گردوخاک کم‌حجم چرخ‌ها و صدای موتور با توقف خودکار در پس‌زمینه
├── storage/
│   └── bestTimeStorage.ts    # ذخیرهٔ محلی بهترین زمان و قالب‌بندی اعداد انگلیسی
├── platform/
│   └── mobileBridge.ts       # پل Back/Pause اندروید، Capacitor و قفل افقی مرورگر
├── game/
│   └── GameEngine.ts         # حلقهٔ اصلی مستقل از React (PixiJS + Physics + Camera + Audio)
├── ui/
│   ├── StartOverlay.tsx      # صفحهٔ شروع بازی
│   ├── HudOverlay.tsx        # HUD رانندگی و ۴ دکمهٔ بزرگ لمسی با رعایت Safe Area
│   └── Overlays.tsx          # منوهای توقف، شکست، پایان مرحله و پیام افقی‌کردن گوشی
├── styles/
│   └── game.css              # استایل‌های واکنش‌گرا و افقی بدون وابستگی CDN
├── App.tsx                   # اتصال React UI به GameEngine
└── main.tsx
```

---

## ۴. محل تنظیمات فیزیک

تمام پارامترهای فیزیک در فایل زیر متمرکز شده‌اند:

**`src/config/physicsConfig.ts`**

شامل:
- `world`: مقیاس متری (`pixelsPerMeter`)، جاذبه (`gravityY`)، گام ثابت `1/60`، سقف `maxFrameDt` برای جلوگیری از جهش زمانی
- `chassis`: جرم (`massKg`)، اینرسی (`inertia`)، مرکز ثقل (`centerOfMassX`, `centerOfMassY`)، میرایی خطی/زاویه‌ای
- `wheels`: شعاع چرخ (`radius`)، جایگاه محور عقب و جلو، چگالی و اصطکاک لاستیک (`friction`)
- `suspension`: فرکانس فنر (`rearFrequencyHz`, `frontFrequencyHz`)، نسبت میرایی (`dampingRatio`)، دامنهٔ حرکت و ضربه‌گیر انتهای کورس (`maxCompression`, `maxExtension`, `bumpStopStiffness`)
- `drive`: گشتاور موتور (`maxMotorTorque`)، سرعت هدف (`targetWheelOmega`) و قدرت ترمز (`brakeTorque`)
- `balance`: گشتاور کمکی تعادل روی زمین و در هوا (`groundLeanTorque`, `airLeanTorque`)
- `crash`: آستانهٔ برخورد سر راننده، محدودیت واژگونی ادامه‌دار و سقوط خارج از محدوده

---

## ۵. کنترل‌ها

- **لمسی (موبایل):**
  - پایین راست: **گاز** و **ترمز**
  - پایین چپ: **تمایل به عقب** و **تمایل به جلو**
  - پشتیبانی کامل از لمس همزمان چند دکمه
- **صفحه‌کلید (دسکتاپ):**
  - `W` یا فلش بالا: گاز
  - `S` یا فلش پایین: ترمز
  - `A` / `D` (یا فلش چپ/راست): تعادل عقب و جلو
  - `R`: شروع دوباره
  - `Escape`: توقف و ادامه
