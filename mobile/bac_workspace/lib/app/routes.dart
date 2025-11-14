import 'package:flutter/material.dart';

import '../features/home/home_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/register_screen.dart';
import '../features/mail/screens/inbox_screen.dart';
import '../features/mail/screens/compose_screen.dart';
import '../features/mail/screens/email_detail_screen.dart';
import '../features/docs/screens/document_list_screen.dart';
import '../features/docs/screens/document_editor_screen.dart';
import '../features/sheets/screens/spreadsheet_list_screen.dart';
import '../features/sheets/screens/spreadsheet_editor_screen.dart';
import '../features/drive/screens/drive_screen.dart';
import '../features/crm/screens/crm_screen.dart';
import '../features/calendar/screens/calendar_screen.dart';
import '../features/meet/screens/meet_screen.dart';
import '../features/chat/screens/chat_screen.dart';
import '../features/notes/screens/notes_screen.dart';

class Routes {
  static const String splash = '/';
  static const String login = '/login';
  static const String register = '/register';
  static const String home = '/home';

  // Mail
  static const String mailInbox = '/mail/inbox';
  static const String mailCompose = '/mail/compose';
  static const String mailDetail = '/mail/detail';

  // Docs
  static const String docsList = '/docs/list';
  static const String docsEditor = '/docs/editor';

  // Sheets
  static const String sheetsList = '/sheets/list';
  static const String sheetsEditor = '/sheets/editor';

  // Drive
  static const String drive = '/drive';

  // CRM
  static const String crm = '/crm';

  // Calendar
  static const String calendar = '/calendar';

  // Meet
  static const String meet = '/meet';

  // Chat
  static const String chat = '/chat';

  // Notes
  static const String notes = '/notes';

  static Route<dynamic> generateRoute(RouteSettings settings) {
    switch (settings.name) {
      case splash:
        return MaterialPageRoute(builder: (_) => const SplashScreen());

      case login:
        return MaterialPageRoute(builder: (_) => const LoginScreen());

      case register:
        return MaterialPageRoute(builder: (_) => const RegisterScreen());

      case home:
        return MaterialPageRoute(builder: (_) => const HomeScreen());

      // Mail routes
      case mailInbox:
        return MaterialPageRoute(builder: (_) => const InboxScreen());

      case mailCompose:
        return MaterialPageRoute(builder: (_) => const ComposeScreen());

      case mailDetail:
        final args = settings.arguments as Map<String, dynamic>?;
        return MaterialPageRoute(
          builder: (_) => EmailDetailScreen(emailId: args?['emailId']),
        );

      // Docs routes
      case docsList:
        return MaterialPageRoute(builder: (_) => const DocumentListScreen());

      case docsEditor:
        final args = settings.arguments as Map<String, dynamic>?;
        return MaterialPageRoute(
          builder: (_) => DocumentEditorScreen(documentId: args?['documentId']),
        );

      // Sheets routes
      case sheetsList:
        return MaterialPageRoute(builder: (_) => const SpreadsheetListScreen());

      case sheetsEditor:
        final args = settings.arguments as Map<String, dynamic>?;
        return MaterialPageRoute(
          builder: (_) => SpreadsheetEditorScreen(spreadsheetId: args?['spreadsheetId']),
        );

      // Other routes
      case drive:
        return MaterialPageRoute(builder: (_) => const DriveScreen());

      case crm:
        return MaterialPageRoute(builder: (_) => const CRMScreen());

      case calendar:
        return MaterialPageRoute(builder: (_) => const CalendarScreen());

      case meet:
        return MaterialPageRoute(builder: (_) => const MeetScreen());

      case chat:
        return MaterialPageRoute(builder: (_) => const ChatScreen());

      case notes:
        return MaterialPageRoute(builder: (_) => const NotesScreen());

      default:
        return MaterialPageRoute(
          builder: (_) => Scaffold(
            body: Center(
              child: Text('No route defined for ${settings.name}'),
            ),
          ),
        );
    }
  }
}

// Placeholder Splash Screen
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Auto-navigate to login after 2 seconds
    Future.delayed(const Duration(seconds: 2), () {
      Navigator.pushReplacementNamed(context, Routes.login);
    });

    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.business,
              size: 100,
              color: Theme.of(context).primaryColor,
            ),
            const SizedBox(height: 20),
            const Text(
              'BAC Workspace',
              style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            const Text(
              'Business at the Speed of Prompt™',
              style: TextStyle(fontSize: 14, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }
}
