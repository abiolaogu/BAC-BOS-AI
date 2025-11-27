import 'package:flutter/material.dart';

class InboxScreen extends StatelessWidget {
  final String? emailId;
  
  const InboxScreen({super.key, this.emailId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('BAC Mail')),
      body: const Center(child: Text('inbox Screen')),
    );
  }
}
