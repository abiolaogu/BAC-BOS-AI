import 'package:flutter/material.dart';

class EmailDetailScreen extends StatelessWidget {
  final String? emailId;
  
  const EmailDetailScreen({super.key, this.emailId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('BAC Mail')),
      body: const Center(child: Text('email detail Screen')),
    );
  }
}
