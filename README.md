# Best Market - Customer App

Mobile application for the Best Market e-commerce platform. Built with React Native (Expo) for iOS and Android.

## Prerequisites

Make sure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Git](https://git-scm.com/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Moody0/Best-Market-App.git
cd Best-Market-App
```

2. Install dependencies:
```bash
npm install
```

## Running the App

Start the Expo development server:
```bash
npm start
```

This will open the Expo Developer Tools in your browser. You can run the app by:
- Scanning the QR code with the Expo Go app on your physical device (Android/iOS).
- Pressing `a` to open in an Android Emulator.
- Pressing `i` to open in an iOS Simulator (requires Mac).

## Building for Production

To build the APK/AAB for Android or IPA for iOS, this project uses EAS (Expo Application Services).

```bash
npm install -g eas-cli
eas login
eas build --profile preview --platform android
```
