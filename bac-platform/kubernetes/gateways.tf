
# Production Gateway
resource "kubernetes_manifest" "production_gateway" {
  manifest = {
    apiVersion = "networking.istio.io/v1alpha3"
    kind       = "Gateway"
    metadata = {
      name      = "production-gateway"
      namespace = "istio-system"
    }
    spec = {
      selector = {
        istio = "ingressgateway"
      }
      servers = [
        {
          port = {
            number   = 80
            name     = "http"
            protocol = "HTTP"
          }
          hosts = [
            "bac-prod.com",
          ]
        },
      ]
    }
  }
}

# Production Virtual Service
resource "kubernetes_manifest" "production_virtual_service" {
  manifest = {
    apiVersion = "networking.istio.io/v1alpha3"
    kind       = "VirtualService"
    metadata = {
      name      = "production-virtual-service"
      namespace = "default"
    }
    spec = {
      hosts = [
        "bac-prod.com",
      ]
      gateways = [
        "istio-system/production-gateway",
      ]
      http = [
        {
          match = [
            {
              uri = {
                prefix = "/"
              }
            },
          ]
          route = [
            {
              destination = {
                host = "hello-world"
                port = {
                  number = 8080
                }
              }
            },
          ]
        },
      ]
    }
  }
}

# Staging Gateway
resource "kubernetes_manifest" "staging_gateway" {
  manifest = {
    apiVersion = "networking.istio.io/v1alpha3"
    kind       = "Gateway"
    metadata = {
      name      = "staging-gateway"
      namespace = "istio-system"
    }
    spec = {
      selector = {
        istio = "ingressgateway"
      }
      servers = [
        {
          port = {
            number   = 80
            name     = "http"
            protocol = "HTTP"
          }
          hosts = [
            "bac-staging.com",
          ]
        },
      ]
    }
  }
}

# Staging Virtual Service
resource "kubernetes_manifest" "staging_virtual_service" {
  manifest = {
    apiVersion = "networking.istio.io/v1alpha3"
    kind       = "VirtualService"
    metadata = {
      name      = "staging-virtual-service"
      namespace = "default"
    }
    spec = {
      hosts = [
        "bac-staging.com",
      ]
      gateways = [
        "istio-system/staging-gateway",
      ]
      http = [
        {
          match = [
            {
              uri = {
                prefix = "/"
              }
            },
          ]
          route = [
            {
              destination = {
                host = "hello-world"
                port = {
                  number = 8080
                }
              }
            },
          ]
        },
      ]
    }
  }
}

# Development Gateway
resource "kubernetes_manifest" "development_gateway" {
  manifest = {
    apiVersion = "networking.istio.io/v1alpha3"
    kind       = "Gateway"
    metadata = {
      name      = "development-gateway"
      namespace = "istio-system"
    }
    spec = {
      selector = {
        istio = "ingressgateway"
      }
      servers = [
        {
          port = {
            number   = 80
            name     = "http"
            protocol = "HTTP"
          }
          hosts = [
            "bac-dev.com",
          ]
        },
      ]
    }
  }
}

# Development Virtual Service
resource "kubernetes_manifest" "development_virtual_service" {
  manifest = {
    apiVersion = "networking.istio.io/v1alpha3"
    kind       = "VirtualService"
    metadata = {
      name      = "development-virtual-service"
      namespace = "default"
    }
    spec = {
      hosts = [
        "bac-dev.com",
      ]
      gateways = [
        "istio-system/development-gateway",
      ]
      http = [
        {
          match = [
            {
              uri = {
                prefix = "/"
              }
            },
          ]
          route = [
            {
              destination = {
                host = "hello-world"
                port = {
                  number = 8080
                }
              }
            },
          ]
        },
      ]
    }
  }
}
