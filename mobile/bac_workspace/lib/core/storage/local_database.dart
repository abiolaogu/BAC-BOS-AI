import 'package:hive_flutter/hive_flutter.dart';

class LocalDatabase {
  static const String userBox = 'users';
  static const String settingsBox = 'settings';
  static const String cacheBox = 'cache';

  static Future<void> init() async {
    await Hive.initFlutter();
    
    // Register adapters
    // Hive.registerAdapter(UserAdapter());
    
    // Open boxes
    await Hive.openBox(userBox);
    await Hive.openBox(settingsBox);
    await Hive.openBox(cacheBox);
  }

  static Box getBox(String boxName) {
    return Hive.box(boxName);
  }

  static Future<void> clearAll() async {
    await Hive.box(userBox).clear();
    await Hive.box(settingsBox).clear();
    await Hive.box(cacheBox).clear();
  }
}
