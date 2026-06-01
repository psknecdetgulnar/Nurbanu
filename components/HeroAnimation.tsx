'use client';

import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export default function HeroAnimation() {
  return (
    <div className="w-full max-w-[480px] mx-auto lg:mx-0">
      <DotLottieReact
        src="/animasyon.lottie"
        loop
        autoplay
      />
    </div>
  );
}
