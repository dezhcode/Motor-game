import { useEffect, useRef } from 'react';
import { garageLevels, type GarageProgress } from '../storage/garageStorage';
import { MAX_UPGRADE_LEVEL, upgradePrice } from '../vehicles/vehicleUpgrades';
import {
  FRIDAY_COMPLETE, FRIDAY_GARAGE, FRIDAY_NAMES, FRIDAY_PRIZE, FRIDAY_SCENES,
  FRIDAY_START_LINE, FRIDAY_TITLE, fridayArt, fridayPrize,
} from '../story/dustyFridays';
import { SkinButton } from './BitmapSurface';
import { ControlContents } from './ControlContents';
import './friday-chapter.css';

interface Props {
  garage: GarageProgress;
  onAdvance: (scene: number) => void;
  onRace: () => void;
  onUpgrade: (level: number) => void;
  onExit: () => void;
}

const number = new Intl.NumberFormat('fa-IR');

export function FridayChapter({ garage, onAdvance, onRace, onUpgrade, onExit }: Props) {
  const scene = garage.friday?.scene ?? 0;
  const complete = scene === FRIDAY_COMPLETE;
  const frame = FRIDAY_SCENES[Math.min(scene, FRIDAY_GARAGE)];
  const next = FRIDAY_SCENES[scene + 1];
  const level = garageLevels(garage, 'motorcycle').suspension;
  const price = upgradePrice('suspension', level);
  const place = garage.friday?.place;
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
    if (next) {
      const image = new Image();
      image.src = fridayArt(next.file);
    }
  }, [scene, next]);

  const action = scene === FRIDAY_START_LINE
    ? { label: 'شروع مسابقهٔ اول', run: onRace }
    : complete
      ? { label: 'بازگشت به خانه', run: onExit }
      : { label: 'ادامه', run: () => onAdvance(scene) };

  return (
    <section className="friday-chapter" dir="rtl" aria-label={FRIDAY_TITLE}>
      <img className="friday-frame" src={fridayArt(frame.file)} alt="" draggable={false} />
      <header className="friday-header">
        <div>
          <span>فصل اول</span>
          <h1>{FRIDAY_TITLE}</h1>
        </div>
        <SkinButton className="game-action-btn friday-action" onClick={onExit}>
          <ControlContents icon="back">خروج از داستان</ControlContents>
        </SkinButton>
      </header>

      <div className="friday-caption">
        {frame.speaker && (
          <div className="friday-portrait" aria-hidden="true">
            <img src={fridayArt(frame.speaker)} alt="" />
          </div>
        )}
        <div className="friday-copy">
          <div className="friday-scene-meta">
            <span>{complete ? 'مرحلهٔ اول کامل شد' : `قاب ${number.format(scene + 1)} از ${number.format(FRIDAY_SCENES.length)}`}</span>
            {frame.speaker && <span>{FRIDAY_NAMES[frame.speaker]}</span>}
          </div>
          <h2 ref={titleRef} tabIndex={-1}>{complete ? 'تا جمعهٔ بعد' : frame.title}</h2>
          <p>{complete ? 'آرش موتور را کنار در پارک کرد. مسابقهٔ بعدی از روی پل چوبی می‌گذرد.' : frame.text}</p>
          {scene === FRIDAY_PRIZE && place && (
            <p className="friday-result">
              {place === 1 ? 'رتبهٔ اول' : 'رتبهٔ دوم'} · جایزهٔ مسابقه {number.format(fridayPrize(place))} سکه
            </p>
          )}
          {scene === FRIDAY_GARAGE && (
            <p className="friday-result">
              موجودی {number.format(garage.coins)} سکه
              {level === MAX_UPGRADE_LEVEL && ' · کمک‌فنر در بالاترین سطح است'}
            </p>
          )}
        </div>
        <div className="friday-nav">
          {scene === FRIDAY_GARAGE ? (
            <>
              <SkinButton className="game-action-btn primary friday-action"
                disabled={level >= MAX_UPGRADE_LEVEL || garage.coins < price}
                onClick={() => onUpgrade(level)}>
                <ControlContents>ارتقای کمک · {number.format(price)} سکه</ControlContents>
              </SkinButton>
              <SkinButton className="game-action-btn friday-action" onClick={() => onAdvance(scene)}>
                <ControlContents>نگه‌داشتن سکه‌ها</ControlContents>
              </SkinButton>
            </>
          ) : (
            <SkinButton className="game-action-btn primary friday-action" onClick={action.run}>
              <ControlContents>{action.label}</ControlContents>
            </SkinButton>
          )}
        </div>
      </div>
    </section>
  );
}
