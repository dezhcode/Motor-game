import React from 'react';

/** Dedicated title-screen illustration, independent of the gameplay sprite rig. */
export const HomeRiderArt: React.FC = () => (
  <img
    src={new URL('./assets/art/home/hero-jump.webp', document.baseURI).href}
    className="home-rider-image"
    alt="تصویر نمایشی موتور فیروزه‌ای کویرسوار در پرش سه‌رخ، با نور طلایی و رد گردوخاک"
    draggable={false}
    decoding="async"
  />
);
