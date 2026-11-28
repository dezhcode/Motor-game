import { UPGRADE_INFO } from '../vehicles/vehicleUpgrades';

export const FRIDAY_TITLE = 'جمعه‌های خاکی';
export const FRIDAY_START_LINE = 5;
export const FRIDAY_RECAP = 6;
export const FRIDAY_PRIZE = 7;
export const FRIDAY_GARAGE = 8;
export const FRIDAY_COMPLETE = 9;
export type FridayPlace = 1 | 2;
export type FridaySpeaker = 'arash' | 'khale-nahid' | 'raha';

interface StoryScene {
  file: string;
  title: string;
  text: string;
  speaker?: FridaySpeaker;
}

export const FRIDAY_SCENES: readonly StoryScene[] = [
  {
    file: '01-bakery', title: 'از نانوایی تا خانه',
    text: 'آرش حتی برای راه برگشت از نانوایی هم زمان می‌گرفت.',
  },
  {
    file: '02-spectator', title: 'کنار جادهٔ خاکی',
    text: 'هر جمعه از همین‌جا مسابقهٔ آبادی را تماشا می‌کرد. دلش می‌خواست یک‌بار آن طرف پرچم باشد.',
  },
  {
    file: '03-race-poster', title: 'آگهیِ تازه',
    text: 'هرکس در مسابقه‌های محلی امتیاز کافی بگیرد، می‌تواند در جام هفت آبادی شرکت کند.',
  },
  {
    file: '04-registration', title: 'ثبت‌نام',
    text: 'آرش اسمش را نوشت. جلوی «وسیله» هم نوشت «موتور کویری».',
  },
  {
    file: '05-number-17', title: 'شمارهٔ ۱۷',
    text: 'آرش پرسید «موتور منم می‌تونه با اینا مسابقه بده؟» خاله گفت «الان دیگه باید بتونه. شماره‌ت رو چسبوندم.»',
    speaker: 'khale-nahid',
  },
  {
    file: '06-start-line', title: 'خط استارت',
    text: 'ببینم از روی موتور هم می‌تونی اون دست‌انداز رو رد کنی، شماره هفده!',
    speaker: 'raha',
  },
  {
    file: '07-crest-and-landing', title: 'روی تپه',
    text: 'رها پیش از سرازیری گاز را رها کرد. آرش بالاخره آن دست‌انداز را از روی موتور دید.',
  },
  {
    file: '08-after-finish', title: 'بعدِ خط پایان',
    text: 'پول جایزه رو بده. اول کمک جلو رو درست کنیم. می‌خوام فردا دوباره همین مسیر رو برم.',
    speaker: 'arash',
  },
  {
    file: '09-garage', title: 'پاتوق گاراژ',
    text: 'با سکه‌ها چه کار می‌کنی؟ کمک‌فنر موتور کویری را ارتقا بده یا برای وسیلهٔ بعدی پس‌انداز کن.',
  },
];

export const FRIDAY_NAMES: Record<FridaySpeaker, string> = {
  arash: 'آرش', 'khale-nahid': 'خاله ناهید', raha: 'رها',
};

export function fridayPrize(place: FridayPlace): number {
  return UPGRADE_INFO.suspension.cost + (place === 1 ? 75 : 0);
}

export function fridayArt(file: string): string {
  return new URL(`./assets/art/story/friday/${file}.webp`, document.baseURI).href;
}
