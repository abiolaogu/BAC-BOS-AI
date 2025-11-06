
# Istio Namespace
resource "kubernetes_namespace" "istio_system" {
  metadata {
    name = "istio-system"
  }
}

# Istio Helm Chart
resource "helm_release" "istio_base" {
  name       = "istio-base"
  repository = "https://istio-release.storage.googleapis.com/charts"
  chart      = "base"
  namespace  = kubernetes_namespace.istio_system.metadata[0].name
  version    = "1.18.2" # Use a specific version for stability
}

resource "helm_release" "istiod" {
  name       = "istiod"
  repository = "https://istio-release.storage.googleapis.com/charts"
  chart      = "istiod"
  namespace  = kubernetes_namespace.istio_system.metadata[0].name
  version    = "1.18.2"

  # Enable mTLS by default
  set {
    name  = "global.mtls.enabled"
    value = "true"
  }

  depends_on = [helm_release.istio_base]
}

# Istio Ingress Gateway
resource "helm_release" "istio_ingress" {
  name       = "istio-ingressgateway"
  repository = "https://istio-release.storage.googleapis.com/charts"
  chart      = "gateway"
  namespace  = kubernetes_namespace.istio_system.metadata[0].name
  version    = "1.18.2"

  depends_on = [helm_release.istiod]
}
