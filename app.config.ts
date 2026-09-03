import type { ExpoConfig } from 'expo/config';

/**
 * App identity lives here. To rename the app, change `name` (and optionally
 * `android.package`) — nothing else references these strings.
 *
 * `scheme` MUST stay in sync with the Supabase redirect allow-list
 * (Auth -> URL Configuration -> Redirect URLs: `pfa://auth/callback` and
 * `pfa://**`), because the Google OAuth flow returns to the app through this
 * deep link. `pfa://*` does not work: Supabase matches those patterns as globs
 * in which `*` stops at a `/`, so it never matches the two-segment path.
 *
 * The redirect also needs a matching route at `src/app/auth/callback.tsx`, or
 * the user lands on "Page not found" with a valid session behind it.
 */
const SCHEME = 'pfa';

const config: ExpoConfig = {
  name: 'MyFinance',
  slug: 'personal-finance-app',
  version: '0.1.2',

  /**
   * Which installed builds an over-the-air update is allowed to reach.
   *
   * `fingerprint` rather than the `appVersion` policy the CLI suggests:
   * appVersion ties compatibility to the `version` string above, so adding a
   * native dependency without remembering to bump it would push JavaScript to
   * a binary that cannot run it. This project has already let `version` sit at
   * 0.1.2 while tags moved on, so that is not a theoretical risk here.
   *
   * Fingerprint is computed from the native project itself and changes on its
   * own whenever anything affecting the runtime does — an SDK upgrade, a new
   * native module, a config plugin. The cost is needing a fresh build more
   * often; the benefit is that a broken update cannot be published at all.
   */
  runtimeVersion: { policy: 'fingerprint' },

  updates: {
    // Points at this project's update server; the id is the EAS project id.
    url: 'https://u.expo.dev/3a73b081-e1af-47cc-bc9d-afd59421b65e',
  },

  orientation: 'portrait',
  scheme: SCHEME,
  icon: './assets/images/icon.png',
  // The design is a single light theme (see src/theme/tokens.ts), so the OS
  // dark-mode setting must not recolour native surfaces underneath it.
  userInterfaceStyle: 'light',
  // The New Architecture is the only option from SDK 55 onward; there is no
  // `newArchEnabled` flag to set any more.

  android: {
    package: 'com.dshelke.myfinance',
    versionCode: 1,
    adaptiveIcon: {
      // colors.primary. The foreground draws the mark in white and mint, so
      // this must stay the dark tile colour — on a light background the mark
      // would all but disappear. Regenerate both with `npm run icons`.
      backgroundColor: '#0B3B4C',
      foregroundImage: './assets/images/android-icon-foreground.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },

    predictiveBackGestureEnabled: false,
  },

  // Kept so `expo export -p web` still works if the PWA is switched on later.
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
    bundler: 'metro',
  },

  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-web-browser',
    '@react-native-community/datetimepicker',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#F4F5FA',
        image: './assets/images/splash-icon.png',
        imageWidth: 96,
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },

  extra: {
    // `eas init` cannot write into a dynamic TypeScript config, so this is set
    // by hand. It must stay a literal rather than reading process.env: the CI
    // runner builds from a clean checkout with no .env, and an undefined id
    // makes `eas build --non-interactive` fail to resolve the project.
    //
    // Not a secret — it appears in every expo.dev URL for this project.
    eas: { projectId: '3a73b081-e1af-47cc-bc9d-afd59421b65e' },
  },
};

export default config;
