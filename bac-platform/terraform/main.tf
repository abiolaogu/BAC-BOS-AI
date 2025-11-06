
# Rancher Cluster
resource "rancher2_cluster" "bac_cluster" {
  name = "bac-cluster"
  rke_config {
    network {
      plugin = "canal"
    }
    services {
      etcd {
        backup_config {
          enabled = true
          interval_hours = 12
          retention = 6
        }
      }
    }
  }
}

# Node Pools (Example with AWS)
resource "rancher2_node_template" "aws_template" {
  name = "aws-template"
  cloud_credential_secret_name = "cattle-global-data:cc-xxxxx" # Replace with your cloud credential secret
  amazonec2_config {
    instance_type = "t3.medium"
    region = var.aws_region
    vpc_id = aws_vpc.bac_vpc.id
    subnet_id = aws_subnet.bac_public_subnet.id
    security_group = [aws_security_group.k8s_nodes.name]
  }
}

resource "rancher2_node_pool" "aws_general_pool" {
  cluster_id = rancher2_cluster.bac_cluster.id
  name = "aws-general"
  node_template_id = rancher2_node_template.aws_template.id
  quantity = 3
  control_plane = true
  etcd = true
  worker = false
  autoscaling_config {
    min_quantity = 3
    max_quantity = 5
  }
}

resource "rancher2_node_pool" "aws_compute_pool" {
  cluster_id = rancher2_cluster.bac_cluster.id
  name = "aws-compute"
  node_template_id = rancher2_node_template.aws_template.id
  quantity = 3
  worker = true
  autoscaling_config {
    min_quantity = 3
    max_quantity = 10
  }
}

resource "rancher2_node_pool" "aws_memory_pool" {
  cluster_id = rancher2_cluster.bac_cluster.id
  name = "aws-memory"
  node_template_id = rancher2_node_template.aws_template.id
  quantity = 2
  worker = true
  autoscaling_config {
    min_quantity = 2
    max_quantity = 8
  }
}

# Vultr Instances
resource "vultr_instance" "general_nodes" {
  count = 3
  name = "vultr-general-${count.index}"
  plan = "vc2-4c-8gb"
  region = "ewr"
  os_id = var.vultr_os_id
  script_id = vultr_startup_script.install_script.id
  firewall_group_id = vultr_firewall_group.k8s_firewall.id
}

resource "vultr_instance" "compute_nodes" {
  count = 5
  name = "vultr-compute-${count.index}"
  plan = "vc2-4c-8gb"
  region = "ewr"
  os_id = var.vultr_os_id
  script_id = vultr_startup_script.install_script.id
  firewall_group_id = vultr_firewall_group.k8s_firewall.id
}

# Rancher Nodes for Vultr
resource "rancher2_node" "general_nodes" {
  count = 3
  cluster_id = rancher2_cluster.bac_cluster.id
  name = "vultr-general-${count.index}"
  control_plane = true
  etcd = true
  worker = false
  address = vultr_instance.general_nodes[count.index].main_ip
  user = "root"
  ssh_key = file("~/.ssh/id_rsa") # Replace with your SSH key path
}

resource "rancher2_node" "compute_nodes" {
  count = 5
  cluster_id = rancher2_cluster.bac_cluster.id
  name = "vultr-compute-${count.index}"
  worker = true
  address = vultr_instance.compute_nodes[count.index].main_ip
  user = "root"
  ssh_key = file("~/.ssh/id_rsa") # Replace with your SSH key path
}


# Placeholder for other providers (OVH, Zenlayer, etc.)
# You would create additional resources for each provider.
