import 'package:flutter/material.dart';

class ComposeScreen extends StatelessWidget {
  final String? emailId;
  
  const ComposeScreen({super.key, this.emailId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('BAC Mail')),
      body: const Center(child: Text('compose Screen')),
    );
  }
}
