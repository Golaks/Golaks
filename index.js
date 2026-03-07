/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import { getApp } from '@react-native-firebase/app';
import notifee, { EventType } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

// Handle background/quit state messages
setBackgroundMessageHandler(getMessaging(getApp()), async (_remoteMessage) => {
  // Background notification received - badge count will update on next app open
});

// Handle notifee background events (required by @notifee)
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS) {
    // User pressed the notification - app will open
  }
});

AppRegistry.registerComponent(appName, () => App);
