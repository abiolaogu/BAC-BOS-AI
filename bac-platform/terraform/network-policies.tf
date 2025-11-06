
# Default Deny-All Ingress Policy
resource "rancher2_network_policy_v2" "default_deny" {
  cluster_id = rancher2_cluster.bac_cluster.id
  name = "default-deny-ingress"
  namespace = "default" # Apply to the default namespace, or change as needed

  ingress {
    # This empty ingress block denies all ingress traffic
  }

  pod_selector = {} # Selects all pods in the namespace
}

# Allow DNS traffic from all pods in the kube-system namespace
resource "rancher2_network_policy_v2" "allow_dns" {
  cluster_id = rancher2_cluster.bac_cluster.id
  name = "allow-dns"
  namespace = "kube-system"

  pod_selector = {
    match_labels = {
      "k8s-app" = "kube-dns"
    }
  }

  ingress {
    from {
      namespace_selector = {} # Allow from any namespace
    }
    ports {
      protocol = "UDP"
      port = 53
    }
  }
}

# Example: Allow traffic within a specific app namespace
# resource "rancher2_network_policy_v2" "app_allow_internal" {
#   cluster_id = rancher2_cluster.bac_cluster.id
#   name = "app-allow-internal"
#   namespace = "my-app" # Example app namespace
#
#   pod_selector = {}
#
#   ingress {
#     from {
#       pod_selector = {} # Allow traffic from any pod in the same namespace
#     }
#   }
# }
