terraform {
  required_providers {
    rancher2 = {
      source  = "rancher/rancher2"
      version = "1.24.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
    vultr = {
      source  = "vultr/vultr"
      version = "~> 2.0"
    }
    ovh = {
      source  = "ovh/ovh"
      version = "~> 0.16"
    }
    openstack = {
      source  = "terraform-provider-openstack/openstack"
      version = "~> 1.49"
    }
  }
}

provider "rancher2" {
  api_url = var.rancher_api_url
  token_key = var.rancher_token_key
}

provider "aws" {
  region = var.aws_region
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

provider "openstack" {
  # Assuming you will use environment variables for authentication
  # (OS_AUTH_URL, OS_USERNAME, OS_PASSWORD, etc.)
}
