
# General
variable "rancher_api_url" {
  description = "Rancher API URL"
  type        = string
}

variable "rancher_token_key" {
  description = "Rancher API Token"
  type        = string
  sensitive   = true
}

# AWS
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "aws_ssh_allowed_cidr" {
  description = "CIDR block allowed for SSH access to AWS nodes"
  type        = string
}

# Azure
variable "azure_location" {
  description = "Azure location"
  type        = string
  default     = "East US"
}

# GCP
variable "gcp_project_id" {
  description = "GCP project ID"
  type        = string
}

variable "gcp_region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}


# Vultr
variable "vultr_api_key" {
  description = "Vultr API Key"
  type        = string
  sensitive   = true
}

variable "vultr_os_id" {
  description = "Vultr OS ID"
  type        = string
  default     = "387" # Ubuntu 20.04
}

variable "vultr_install_script" {
  description = "Startup script for Vultr nodes"
  type        = string
  default     = <<EOF
#!/bin/bash
apt-get update
apt-get install -y curl
EOF
}

# OVH
variable "ovh_application_key" {
  description = "OVH Application Key"
  type        = string
  sensitive   = true
}

variable "ovh_application_secret" {
  description = "OVH Application Secret"
  type        = string
  sensitive   = true
}

variable "ovh_consumer_key" {
  description = "OVH Consumer Key"
  type        = string
  sensitive   = true
}
