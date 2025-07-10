// types/next-pwa.d.ts
declare module 'next-pwa' {
  import { NextConfig } from 'next';

  type WithPWAOptions = {
    dest?: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
    buildExcludes?: ({ file: string }) => boolean;
    fallbacks?: {
      image?: string;
      document?: string;
      // otros posibles fallbacks
    };
  };

  function withPWA(pwaOptions: WithPWAOptions): (nextConfig: NextConfig) => NextConfig;
  export default withPWA;
}
