# AWS VPC (existing)

# AWS Node Templates
resource "rancher2_node_template" "aws_general" {
  name = "aws-general-template"
  amazonec2_config {
    instance_type = var.aws_general_instance_type
    region        = var.aws_region
    # ... other necessary AWS configurations
  }
}

resource "rancher2_node_template" "aws_compute" {
  name = "aws-compute-template"
  amazonec2_config {
    instance_type = var.aws_compute_instance_type
    region        = var.aws_region
    spot_price    = var.aws_use_spot_instances_compute ? "0.5" : ""
    # ... other necessary AWS configurations
  }
}

resource "rancher2_node_template" "aws_memory" {
  name = "aws-memory-template"
  amazonec2_config {
    instance_type = var.aws_memory_instance_type
    region        = var.aws_region
    spot_price    = var.aws_use_spot_instances_memory ? "0.5" : ""
    # ... other necessary AWS configurations
  }
}

# AWS Node Pools
resource "rancher2_node_pool" "aws_general_pool" {
  cluster_id       = rancher2_cluster.bac_cluster.id
  name             = "aws-general"
  node_template_id = rancher2_node_template.aws_general.id
  quantity         = 3
  control_plane    = true
  etcd             = true
  worker           = false

  labels = {
    "node-role" = "general"
  }

  taints = [local.general_taint]
}

resource "rancher2_node_pool" "aws_compute_pool" {
  cluster_id       = rancher2_cluster.bac_cluster.id
  name             = "aws-compute"
  node_template_id = rancher2_node_template.aws_compute.id
  quantity         = 5
  worker           = true

  labels = {
    "node-role" = "compute"
  }

  taints = [local.compute_taint]

  autoscaling_config {
    min_quantity = 3
    max_quantity = 100
  }
}

resource "rancher2_node_pool" "aws_memory_pool" {
  cluster_id       = rancher2_cluster.bac_cluster.id
  name             = "aws-memory"
  node_template_id = rancher2_node_template.aws_memory.id
  quantity         = 3
  worker           = true

  labels = {
    "node-role" = "memory"
  }

  taints = [local.memory_taint]

  autoscaling_config {
    min_quantity = 2
    max_quantity = 50
  }
}
