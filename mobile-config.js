/* globals App */
/* eslint-disable quote-props */

App.configurePlugin('phonegap-plugin-push', {
  SENDER_ID: 437177375084,
});

App.configurePlugin('cordova-plugin-camera', {
  'CAMERA_USAGE_DESCRIPTION': 'To take photos',
});

App.info({
  name: 'Honline',
  description: 'Online Átlátható Társasházkezelés',
  author: 'KDE Alapítvány',
  email: 'info@honline.hu',
  website: 'https://honline.hu/',
  version: '1.0.0',
});

App.icons({
  // iOS
  'iphone_2x': 'resources/icons/icon-60x60@2x.png',
  'ipad': 'resources/icons/icon-76x76.png',
  'ipad_2x': 'resources/icons/icon-76x76@2x.png',

  // Android
  'android_mdpi': 'resources/icons/icon-48x48.png',
  'android_hdpi': 'resources/icons/icon-72x72.png',
  'android_xhdpi': 'resources/icons/icon-96x96.png',
  'android_xxhdpi': 'resources/icons/icon-144x144.png',
  'android_xxxhdpi': 'resources/icons/icon-192x192.png',
});

App.launchScreens({
  // iOS
  'iphone_2x': 'resources/splash/splash-320x480@2x.png',
  'iphone5': 'resources/splash/splash-320x568@2x.png',
  'ipad_portrait': 'resources/splash/splash-768x1024.png',
  'ipad_portrait_2x': 'resources/splash/splash-768x1024@2x.png',
  'ipad_landscape': 'resources/splash/splash-1024x768.png',
  'ipad_landscape_2x': 'resources/splash/splash-1024x768@2x.png',

  // Android
  'android_mdpi_portrait': 'resources/splash/splash-320x480.png',
  'android_mdpi_landscape': 'resources/splash/splash-480x320.png',
  'android_hdpi_portrait': 'resources/splash/splash-480x800.png',
  'android_hdpi_landscape': 'resources/splash/splash-800x480.png',
  'android_xhdpi_portrait': 'resources/splash/splash-720x1280.png',
  'android_xhdpi_landscape': 'resources/splash/splash-1280x720.png',
  'android_xxhdpi_portrait': 'resources/splash/splash-960x1600.png',
  'android_xxhdpi_landscape': 'resources/splash/splash-1600x960.png',
  'android_xxxhdpi_portrait': 'resources/splash/splash-1280x1920.png',
  'android_xxxhdpi_landscape': 'resources/splash/splash-1920x1280.png',
});

App.setPreference('StatusBarOverlaysWebView', 'false');
App.setPreference('StatusBarBackgroundColor', '#000000');
App.setPreference('android-minSdkVersion', 19);
App.setPreference('android-targetSdkVersion', 19);
App.setPreference('WebAppStartupTimeout', 60000);
App.setPreference('AndroidPersistentFileLocation', 'Compatibility');

App.setPreference('BackgroundColor', '0xff0000ff');
App.setPreference('Orientation', 'default');

App.setPreference('LoadUrlTimeoutValue', 1000000);
App.setPreference('WebAppStartupTimeout', 1000000);

App.accessRule('*://fonts.gstatic.com/*');
App.accessRule('*://fonts.googleapis.com/*');
App.accessRule('*://honline.hu/*');
App.accessRule('blob:*');

App.appendToConfig(`
<edit-config target="NSCameraUsageDescription" file="*-Info.plist" mode="merge">
    <string>Need camera access to take pictures</string>
</edit-config>

<edit-config target="NSPhotoLibraryUsageDescription" file="*-Info.plist" mode="merge">
    <string>Need photo library acess to upload images from galery</string>
</edit-config>
`);
