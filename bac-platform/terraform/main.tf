resource "rancher2_cluster" "bac_cluster" {
  name        = "bac-cluster"
  description = "BAC Platform Kubernetes Cluster"

  rke_config {
    kubernetes_version = "v1.24.8-rancher1-1"

    network {
      plugin = "canal"
    }

    services {
      etcd {
        backup_config {
          enabled        = true
          interval_hours = 12
          retention      = 6
        }
      }
    }

    monitoring {
      provider = "rancher-monitoring"
    }

    ingress {
      provider = "nginx"
    }
  }
}

# Node Taints
locals {
  general_taint = {
    key    = "node-role.kubernetes.io/general"
    value  = "true"
    effect = "NoSchedule"
  }
  compute_taint = {
    key    = "node-role.kubernetes.io/compute"
    value  = "true"
    effect = "NoSchedule"
  }
  memory_taint = {
    key    = "node-role.kubernetes.io/memory"
    value  = "true"
    effect = "NoSchedule"
  }
}
