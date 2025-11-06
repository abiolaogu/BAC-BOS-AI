# OpenStack Node Templates
resource "rancher2_node_template" "openstack_general" {
  name = "openstack-general-template"
  openstack_config {
    flavor_name = "m1.xlarge" # Example flavor
    image_name  = "ubuntu-20.04"
    region      = var.openstack_region
    # ... other necessary OpenStack configurations
  }
}

resource "rancher2_node_template" "openstack_compute" {
  name = "openstack-compute-template"
  openstack_config {
    flavor_name = "c1.xlarge" # Example flavor
    image_name  = "ubuntu-20.04"
    region      = var.openstack_region
    # ... other necessary OpenStack configurations
  }
}

resource "rancher2_node_template" "openstack_memory" {
  name = "openstack-memory-template"
  openstack_config {
    flavor_name = "r1.xlarge" # Example flavor
    image_name  = "ubuntu-20.04"
    region      = var.openstack_region
    # ... other necessary OpenStack configurations
  }
}

# OpenStack Node Pools
resource "rancher2_node_pool" "openstack_general_pool" {
  cluster_id       = rancher2_cluster.bac_cluster.id
  name             = "openstack-general"
  node_template_id = rancher2_node_template.openstack_general.id
  quantity         = 3
  control_plane    = true
  etcd             = true
  worker           = false

  labels = {
    "node-role" = "general"
  }

  taints = [local.general_taint]
}

resource "rancher2_node_pool" "openstack_compute_pool" {
  cluster_id       = rancher2_cluster.bac_cluster.id
  name             = "openstack-compute"
  node_template_id = rancher2_node_template.openstack_compute.id
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

resource "rancher2_node_pool" "openstack_memory_pool" {
  cluster_id       = rancher2_cluster.bac_cluster.id
  name             = "openstack-memory"
  node_template_id = rancher2_node_template.openstack_memory.id
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
