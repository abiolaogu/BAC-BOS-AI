
# BAC Platform Infrastructure

This repository contains the infrastructure as code for the BAC Platform.

## Prerequisites

- Terraform
- Ansible
- Access to your chosen cloud/bare-metal providers

## Getting Started

1. **Initialize Terraform:**
   ```
   cd terraform
   terraform init
   ```

2. **Configure Variables:**
   - Create a `terraform.tfvars` file to provide values for the variables defined in `variables.tf`.

3. **Apply Terraform:**
   ```
   terraform apply
   ```

4. **Run Ansible:**
   - Once the infrastructure is provisioned, you can use the Ansible playbook to configure the nodes.

