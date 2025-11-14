import 'package:flutter/material.dart';

import '../../app/routes.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;

  final List<Widget> _pages = [
    const AppsGridView(),
    const RecentScreen(),
    const ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('BAC Workspace'),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () {},
          ),
          IconButton(
            icon: const Icon(Icons.notifications),
            onPressed: () {},
          ),
        ],
      ),
      body: _pages[_selectedIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: (index) {
          setState(() {
            _selectedIndex = index;
          });
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.apps),
            label: 'Apps',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.history),
            label: 'Recent',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

class AppsGridView extends StatelessWidget {
  const AppsGridView({super.key});

  @override
  Widget build(BuildContext context) {
    final apps = [
      AppItem(
        name: 'Mail',
        icon: Icons.mail,
        color: Colors.blue,
        route: Routes.mailInbox,
      ),
      AppItem(
        name: 'Calendar',
        icon: Icons.calendar_today,
        color: Colors.red,
        route: Routes.calendar,
      ),
      AppItem(
        name: 'Docs',
        icon: Icons.description,
        color: Colors.indigo,
        route: Routes.docsList,
      ),
      AppItem(
        name: 'Sheets',
        icon: Icons.table_chart,
        color: Colors.green,
        route: Routes.sheetsList,
      ),
      AppItem(
        name: 'Drive',
        icon: Icons.folder,
        color: Colors.orange,
        route: Routes.drive,
      ),
      AppItem(
        name: 'CRM',
        icon: Icons.people,
        color: Colors.purple,
        route: Routes.crm,
      ),
      AppItem(
        name: 'Meet',
        icon: Icons.video_call,
        color: Colors.teal,
        route: Routes.meet,
      ),
      AppItem(
        name: 'Chat',
        icon: Icons.chat,
        color: Colors.pink,
        route: Routes.chat,
      ),
      AppItem(
        name: 'Notes',
        icon: Icons.note,
        color: Colors.amber,
        route: Routes.notes,
      ),
    ];

    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: GridView.builder(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3,
          crossAxisSpacing: 16,
          mainAxisSpacing: 16,
        ),
        itemCount: apps.length,
        itemBuilder: (context, index) {
          final app = apps[index];
          return GestureDetector(
            onTap: () {
              Navigator.pushNamed(context, app.route);
            },
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: app.color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(
                    app.icon,
                    size: 40,
                    color: app.color,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  app.name,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class RecentScreen extends StatelessWidget {
  const RecentScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Text('Recent Activity'),
    );
  }
}

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CircleAvatar(
            radius: 50,
            child: Icon(Icons.person, size: 50),
          ),
          const SizedBox(height: 16),
          const Text(
            'John Doe',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text('john.doe@example.com'),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: () {
              Navigator.pushNamedAndRemoveUntil(
                context,
                Routes.login,
                (route) => false,
              );
            },
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }
}

class AppItem {
  final String name;
  final IconData icon;
  final Color color;
  final String route;

  AppItem({
    required this.name,
    required this.icon,
    required this.color,
    required this.route,
  });
}
