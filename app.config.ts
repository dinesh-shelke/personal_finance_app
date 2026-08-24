import type { ExpoConfig } from 'expo/config';

/**
 * App identity lives here. To rename the app, change `name` (and optionally
 * `android.package`) — nothing else references these strings.
 *
 * `scheme` MUST stay in sync with the Supabase redirect allow-list
 * (Auth -> URL Configuration -> Redirect URLs: `pfa://*`), because the Google
 * OAuth flow returns to the app through this deep link.
 */
const SCHEME = 'pfa';

const config: ExpoConfig = {
  name: 'MyFinance',
  slug: 'personal-finance-app',
  version: '0.1.0',
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
