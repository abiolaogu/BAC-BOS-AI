# BAC Platform Infrastructure with Terraform

This directory contains the Terraform configuration for provisioning the BAC Platform's infrastructure. It is designed to be a multi-cloud setup managed by Rancher.

## Prerequisites

- Terraform v1.0.0 or later
- Access to the required cloud providers (AWS, Vultr, OVH, etc.)
- A Rancher management server already installed and accessible.
- API credentials for Rancher and your chosen cloud providers.

## Configuration

1.  **Provider Configuration:** The `providers.tf` file is configured to use the `rancher2`, `aws`, `vultr`, `ovh`, and `openstack` providers.

2.  **Variable Setup:**
    - Rename the `terraform.tfvars.example` file to `terraform.tfvars`.
    - Populate `terraform.tfvars` with the necessary values, such as your API keys, Rancher URL, and other specific settings for your environment.

    ```hcl
    # Example terraform.tfvars
    rancher_api_url      = "https://your-rancher-instance.com"
    rancher_token_key    = "token-xxxxxxxx"
    aws_region           = "us-east-1"
    aws_ssh_allowed_cidr = "your_ip/32"
    vultr_api_key        = "your_vultr_api_key"
    ovh_application_key  = "your_ovh_app_key"
    # ... and so on for other providers
    ```

## Usage

1.  **Initialize Terraform:**
    Navigate to the `bac-platform/terraform` directory and run the following command to initialize the providers and modules:
    ```bash
    terraform init
    ```

2.  **Plan the Deployment:**
    Review the changes that Terraform will apply to your infrastructure:
    ```bash
    terraform plan
    ```

3.  **Apply the Configuration:**
    If the plan looks correct, apply the configuration to create the infrastructure:
    ```bash
    terraform apply
    ```

## Makefile Operations

A `Makefile` is provided to simplify common tasks.

- `make plan`: Runs `terraform plan`.
- `make apply`: Runs `terraform apply`.
- `make destroy`: Destroys the Terraform-managed infrastructure.
