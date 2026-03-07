/**
 * @format
 */

import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

// Handle background/quit state messages
messaging().setBackgroundMessageHandler(async (_remoteMessage) => {
  // Background notification received - badge count will update on next app open
});

AppRegistry.registerComponent(appName, () => App);
