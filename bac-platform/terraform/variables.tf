variable "rancher_api_url" {
  description = "Rancher API URL"
  type        = string
}

variable "rancher_token_key" {
  description = "Rancher API Token"
  type        = string
  sensitive   = true
}

# AWS Variables
variable "aws_region" {
  description = "AWS region for the cluster"
  type        = string
  default     = "us-east-1"
}

variable "aws_ssh_allowed_cidr" {
  description = "CIDR block to allow SSH access to nodes"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "aws_general_instance_type" {
  description = "Instance type for general-purpose nodes in AWS"
  type        = string
  default     = "t3.xlarge"
}

variable "aws_compute_instance_type" {
  description = "Instance type for compute-optimized nodes in AWS"
  type        = string
  default     = "c5.2xlarge"
}

variable "aws_memory_instance_type" {
  description = "Instance type for memory-optimized nodes in AWS"
  type        = string
  default     = "r5.2xlarge"
}

variable "aws_use_spot_instances_compute" {
  description = "Use spot instances for compute-optimized nodes"
  type        = bool
  default     = true
}

variable "aws_use_spot_instances_memory" {
  description = "Use spot instances for memory-optimized nodes"
  type        = bool
  default     = true
}

# Vultr Variables
variable "vultr_api_key" {
  description = "Vultr API Key"
  type        = string
  sensitive   = true
}

# OVH Variables
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

# OpenStack Variables
variable "openstack_auth_url" {
  description = "OpenStack authentication URL"
  type        = string
}

variable "openstack_user_name" {
  description = "OpenStack user name"
  type        = string
}

variable "openstack_password" {
  description = "OpenStack password"
  type        = string
  sensitive   = true
}

variable "openstack_tenant_name" {
  description = "OpenStack tenant name"
  type        = string
}

variable "openstack_region" {
  description = "OpenStack region"
  type        = string
}
