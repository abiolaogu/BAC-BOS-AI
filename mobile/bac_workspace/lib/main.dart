import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'app/routes.dart';
import 'app/theme.dart';
import 'core/storage/local_database.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Hive
  await Hive.initFlutter();
  await LocalDatabase.init();

  runApp(
    const ProviderScope(
      child: BACWorkspaceApp(),
    ),
  );
}

class BACWorkspaceApp extends StatelessWidget {
  const BACWorkspaceApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ScreenUtilInit(
      designSize: const Size(375, 812),
      minTextAdapt: true,
      splitScreenMode: true,
      builder: (context, child) {
        return MaterialApp(
          title: 'BAC Workspace',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.lightTheme,
          darkTheme: AppTheme.darkTheme,
          themeMode: ThemeMode.system,
          initialRoute: Routes.splash,
          onGenerateRoute: Routes.generateRoute,
        );
      },
    );
  }
}
