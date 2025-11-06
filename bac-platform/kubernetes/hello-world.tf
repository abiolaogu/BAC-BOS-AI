
# Hello World Namespace
resource "kubernetes_namespace" "hello_world" {
  metadata {
    name = "hello-world"
  }
}

# Hello World Deployment
resource "kubernetes_deployment" "hello_world" {
  metadata {
    name      = "hello-world"
    namespace = kubernetes_namespace.hello_world.metadata[0].name
  }

  spec {
    replicas = 1

    selector {
      match_labels = {
        app = "hello-world"
      }
    }

    template {
      metadata {
        labels = {
          app = "hello-world"
        }
      }

      spec {
        container {
          image = "gcr.io/google-samples/hello-app:1.0"
          name  = "hello-world"

          port {
            container_port = 8080
          }
        }
      }
    }
  }
}

# Hello World Service
resource "kubernetes_service" "hello_world" {
  metadata {
    name      = "hello-world"
    namespace = kubernetes_namespace.hello_world.metadata[0].name
  }

  spec {
    selector = {
      app = "hello-world"
    }

    port {
      port        = 8080
      target_port = 8080
    }
  }
}
