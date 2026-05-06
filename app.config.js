import 'dotenv/config';

export default {
  expo: {
    name: "Leopards Ticketing",
    slug: "leopards",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "leopardsmobile",
    userInterfaceStyle: "automatic",
    newArchEnabled: false,
    ios: {
      supportsTablet: true
    },
    android: {
      jsEngine: "hermes",
      adaptiveIcon: {
        foregroundImage: "./assets/icons/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      package: "com.jaevoy.leopards_mobile",
      usesCleartextTraffic: true
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      "expo-dev-client",  
      "expo-audio",
      "expo-font",
      "expo-web-browser",
      [
        "expo-splash-screen",
        {
          image: "./assets/icons/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff"
        },
      ],
      [
        "react-native-ble-plx",
        {
          "isBackgroundEnabled": false,
          "modes": ["peripheral", "central"],
          "bluetoothAlwaysPermission": "Allow $(BUNDLE_ID) to connect to bluetooth devices"
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      eas: {
        projectId: "1111d0d9-33b6-4f01-9dff-f4923bb77502"
      },
      API_URL: process.env.API_URL, 
      API_KEY: process.env.API_KEY,
      ORIGIN: process.env.ORIGIN,
      PUBLIC_SUPABASE_URL: process.env.PUBLIC_SUPABASE_URL,
      PUBLIC_ANON_KEY: process.env.PUBLIC_ANON_KEY
    }
  },
};
