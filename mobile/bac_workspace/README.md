# BAC Workspace Mobile App

Unified mobile application for all BAC Platform services.

## Features

- **BAC Mail** - Email client
- **BAC Docs** - Word processor
- **BAC Sheets** - Spreadsheet
- **BAC Slides** - Presentations
- **BAC Drive** - File storage
- **BAC CRM** - Customer management
- **BAC Calendar** - Calendar and scheduling
- **BAC Meet** - Video conferencing
- **BAC Chat** - Messaging
- **BAC Notes** - Note-taking

## Screenshots

(Coming soon)

## Getting Started

```bash
# Install dependencies
flutter pub get

# Run on iOS
flutter run -d ios

# Run on Android
flutter run -d android

# Build APK
flutter build apk --release

# Build iOS
flutter build ipa --release
```

## Architecture

- **State Management**: Riverpod
- **Network**: Dio
- **Storage**: Hive + Shared Preferences
- **UI**: Material Design 3

## Requirements

- Flutter 3.16+
- Dart 3.0+
- iOS 13+ / Android 5.0+

## License

Apache 2.0
