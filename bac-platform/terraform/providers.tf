
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    rancher2 = {
      source = "rancher/rancher2"
      version = "3.2.1"
    }
    vultr = {
      source  = "vultr/vultr"
      version = "~> 2.0"
    }
    ovh = {
      source  = "ovh/ovh"
      version = "~> 0.36"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
    kubernetes = {
      source = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
}

# Provider configuration (credentials should be handled securely, e.g., through environment variables)
provider "aws" {
  region = var.aws_region
}

provider "azurerm" {
  features {}
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

provider "rancher2" {
  api_url = var.rancher_api_url
  token_key = var.rancher_token_key
}

provider "vultr" {
  api_key = var.vultr_api_key
}

provider "ovh" {
  endpoint           = "ovh-us"
  application_key    = var.ovh_application_key
  application_secret = var.ovh_application_secret
  consumer_key       = var.ovh_consumer_key
}

provider "helm" {
  kubernetes {
    config_path = "~/.kube/config" # Replace with your kubeconfig path if different
  }
}

provider "kubernetes" {
  config_path = "~/.kube/config" # Replace with your kubeconfig path if different
}
