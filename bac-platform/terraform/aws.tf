
# AWS VPC
resource "aws_vpc" "bac_vpc" {
  cidr_block = "10.0.0.0/16"
  enable_dns_support = true
  enable_dns_hostnames = true
  tags = {
    Name = "bac-vpc"
  }
}

# AWS Internet Gateway
resource "aws_internet_gateway" "bac_igw" {
  vpc_id = aws_vpc.bac_vpc.id
  tags = {
    Name = "bac-igw"
  }
}

# AWS Public Subnet
resource "aws_subnet" "bac_public_subnet" {
  vpc_id     = aws_vpc.bac_vpc.id
  cidr_block = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone = "${var.aws_region}a" # Use the first AZ in the region
  tags = {
    Name = "bac-public-subnet"
  }
}

# AWS Route Table
resource "aws_route_table" "bac_public_rt" {
  vpc_id = aws_vpc.bac_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.bac_igw.id
  }

  tags = {
    Name = "bac-public-rt"
  }
}

# AWS Route Table Association
resource "aws_route_table_association" "bac_public_rta" {
  subnet_id      = aws_subnet.bac_public_subnet.id
  route_table_id = aws_route_table.bac_public_rt.id
}


# AWS Security Group for Kubernetes Nodes
resource "aws_security_group" "k8s_nodes" {
  name        = "bac-k8s-nodes"
  description = "Security group for BAC Platform Kubernetes nodes"
  vpc_id      = aws_vpc.bac_vpc.id # Associate with our VPC

  # Inbound rules
  ingress {
    description = "Allow SSH from trusted source"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.aws_ssh_allowed_cidr]
  }

  ingress {
    description = "Allow all traffic from within the security group"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    self        = true
  }

  # K8s API server from nodes
  ingress {
    description = "Allow K8s API server from nodes"
    from_port   = 6443
    to_port     = 6443
    protocol    = "tcp"
    self        = true
  }

  # Canal/Flannel networking
  ingress {
    description = "Allow Canal/Flannel UDP"
    from_port   = 8472
    to_port     = 8472
    protocol    = "udp"
    self        = true
  }
  
  # Required for node-to-node pod communication
  ingress {
    from_port = 0
    to_port   = 0
    protocol  = "-1"
    cidr_blocks = [aws_vpc.bac_vpc.cidr_block]
  }

  # Outbound rules
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "bac-k8s-nodes"
  }
}
