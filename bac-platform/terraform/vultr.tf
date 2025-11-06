
# Vultr Startup Script
resource "vultr_startup_script" "install_script" {
  name   = "install-dependencies"
  script = var.vultr_install_script
}

# Vultr Firewall Group
resource "vultr_firewall_group" "k8s_firewall" {
  name = "k8s-firewall"
}

# Vultr Firewall Rules
resource "vultr_firewall_rule" "allow_ssh" {
  firewall_group_id = vultr_firewall_group.k8s_firewall.id
  protocol         = "tcp"
  port             = "22"
  source           = "0.0.0.0/0" # For simplicity, but you should restrict this
  notes            = "Allow SSH"
}

resource "vultr_firewall_rule" "allow_k8s_api" {
  firewall_group_id = vultr_firewall_group.k8s_firewall.id
  protocol         = "tcp"
  port             = "6443"
  source           = "0.0.0.0/0" # For simplicity, but you should restrict this
  notes            = "Allow K8s API server"
}

resource "vultr_firewall_rule" "allow_canal_udp" {
  firewall_group_id = vultr_firewall_group.k8s_firewall.id
  protocol         = "udp"
  port             = "8472"
  source           = "0.0.0.0/0" # For simplicity, but you should restrict this
  notes            = "Allow Canal/Flannel UDP"
}
