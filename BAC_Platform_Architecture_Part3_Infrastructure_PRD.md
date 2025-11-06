# BAC Platform - Complete Architecture Design
## Part 3: Infrastructure, DevOps, PRD, Project Plan & Deployment

**Document Version:** 1.0  
**Last Updated:** November 6, 2025  
**Prepared By:** YOUR COMPANY Architecture Team

---

## Table of Contents

1. [API Gateway & Integration Layer](#1-api-gateway--integration-layer)
2. [Security Architecture](#2-security-architecture)
3. [Infrastructure & DevOps](#3-infrastructure--devops)
4. [Scalability & Performance](#4-scalability--performance)
5. [Disaster Recovery & Business Continuity](#5-disaster-recovery--business-continuity)
6. [Product Requirements Document (PRD)](#6-product-requirements-document-prd)
7. [Detailed Project Plan with Gantt Charts](#7-detailed-project-plan-with-gantt-charts)
8. [Deployment Strategy](#8-deployment-strategy)
9. [Cost Analysis & Budget](#9-cost-analysis--budget)
10. [Success Metrics & KPIs](#10-success-metrics--kpis)

---

## 1. API Gateway & Integration Layer

### 1.1 Kong Gateway Architecture

**Deployment Configuration:**

```yaml
# kong-gateway/values.yaml (Helm Chart)
apiVersion: v2
name: kong-gateway
version: 3.5.0

deployment:
  kong:
    enabled: true
    
    # Pod configuration
    replicaCount: 5  # High availability
    
    # Resource allocation
    resources:
      requests:
        cpu: 1000m
        memory: 2Gi
      limits:
        cpu: 2000m
        memory: 4Gi
    
    # Auto-scaling
    autoscaling:
      enabled: true
      minReplicas: 5
      maxReplicas: 50
      targetCPUUtilizationPercentage: 70
      targetMemoryUtilizationPercentage: 80
    
    # Environment variables
    env:
      database: "postgres"
      pg_host: "kong-db.database.svc.cluster.local"
      pg_port: "5432"
      pg_database: "kong"
      
      # Performance tuning
      nginx_worker_processes: "auto"
      nginx_worker_connections: "10240"
      
      # Security
      ssl_cipher_suite: "modern"
      ssl_protocols: "TLSv1.3"
      
      # Plugins
      plugins: "bundled,oidc,rate-limiting,cors,jwt,request-transformer"
    
    # Health checks
    readinessProbe:
      httpGet:
        path: /status
        port: 8001
      initialDelaySeconds: 30
      periodSeconds: 10
    
    livenessProbe:
      httpGet:
        path: /status
        port: 8001
      initialDelaySeconds: 60
      periodSeconds: 30

  # Kong database (PostgreSQL)
  postgresql:
    enabled: true
    replicaCount: 3
    primary:
      persistence:
        size: 100Gi
    readReplicas:
      replicaCount: 2

  # Kong ingress controller
  ingressController:
    enabled: true
    installCRDs: true
    
    resources:
      requests:
        cpu: 500m
        memory: 512Mi
      limits:
        cpu: 1000m
        memory: 1Gi

# Service configuration
service:
  type: LoadBalancer
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
  
  # Ports
  proxy:
    http:
      enabled: true
      servicePort: 80
      containerPort: 8000
    https:
      enabled: true
      servicePort: 443
      containerPort: 8443
  
  admin:
    enabled: true
    servicePort: 8444
    containerPort: 8444
```

**Kong Plugin Configurations:**

```yaml
# Rate Limiting Plugin
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: rate-limiting-global
plugin: rate-limiting
config:
  minute: 1000
  hour: 50000
  day: 1000000
  policy: redis
  redis_host: dragonfly-cache.cache.svc.cluster.local
  redis_port: 6379
  redis_database: 1
  fault_tolerant: true
  hide_client_headers: false
---
# JWT Authentication Plugin
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: jwt-auth
plugin: jwt
config:
  key_claim_name: iss
  secret_is_base64: false
  claims_to_verify:
    - exp
    - nbf
  run_on_preflight: false
---
# CORS Plugin
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: cors-global
plugin: cors
config:
  origins:
    - https://*.yourcompany.com
    - https://app.yourcompany.com
  methods:
    - GET
    - POST
    - PUT
    - PATCH
    - DELETE
    - OPTIONS
  headers:
    - Accept
    - Authorization
    - Content-Type
    - X-Request-ID
  exposed_headers:
    - X-Request-ID
    - X-RateLimit-Limit
    - X-RateLimit-Remaining
  credentials: true
  max_age: 3600
---
# Request Transformer Plugin
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: request-transformer
plugin: request-transformer
config:
  add:
    headers:
      - X-Gateway-Version:3.5.0
      - X-Request-Time:$(date -u +%Y-%m-%dT%H:%M:%SZ)
  remove:
    headers:
      - X-Internal-Secret
  replace:
    headers:
      - X-Forwarded-For:$(X-Real-IP)
---
# OpenID Connect Plugin (Authentication)
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: oidc-keycloak
plugin: oidc
config:
  issuer: https://auth.yourcompany.com/realms/bac
  client_id: bac-api
  client_secret: ${OIDC_CLIENT_SECRET}
  ssl_verify: true
  token_endpoint_auth_method: client_secret_post
  introspection_endpoint: https://auth.yourcompany.com/realms/bac/protocol/openid-connect/token/introspect
  bearer_only: false
  realm: bac
  redirect_uri: https://api.yourcompany.com/auth/callback
  logout_path: /logout
  scope: openid email profile
```

**API Route Configuration:**

```yaml
# CRM Service Routes
apiVersion: configuration.konghq.com/v1
kind: KongIngress
metadata:
  name: crm-api
spec:
  upstream:
    hash_on: header
    hash_on_header: X-Tenant-ID
    algorithm: consistent-hashing
  proxy:
    protocol: http
    connect_timeout: 60000
    write_timeout: 60000
    read_timeout: 60000
  route:
    methods:
      - GET
      - POST
      - PUT
      - PATCH
      - DELETE
    protocols:
      - https
    strip_path: false
    preserve_host: true
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: crm-api-ingress
  annotations:
    konghq.com/plugins: rate-limiting-global,jwt-auth,cors-global,request-transformer
    konghq.com/strip-path: "false"
    konghq.com/preserve-host: "true"
spec:
  ingressClassName: kong
  rules:
  - host: api.yourcompany.com
    http:
      paths:
      - path: /v1/crm
        pathType: Prefix
        backend:
          service:
            name: crm-service
            port:
              number: 8080
---
# ERP Service Routes
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: erp-api-ingress
  annotations:
    konghq.com/plugins: rate-limiting-global,jwt-auth,cors-global
spec:
  ingressClassName: kong
  rules:
  - host: api.yourcompany.com
    http:
      paths:
      - path: /v1/erp
        pathType: Prefix
        backend:
          service:
            name: erp-service
            port:
              number: 8080
---
# Analytics Service Routes (Higher rate limits for reporting)
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: rate-limiting-analytics
plugin: rate-limiting
config:
  minute: 100
  hour: 5000
  policy: redis
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: analytics-api-ingress
  annotations:
    konghq.com/plugins: rate-limiting-analytics,jwt-auth,cors-global
spec:
  ingressClassName: kong
  rules:
  - host: api.yourcompany.com
    http:
      paths:
      - path: /v1/analytics
        pathType: Prefix
        backend:
          service:
            name: analytics-service
            port:
              number: 8080
```

### 1.2 GraphQL Federation

**Apollo Federation Gateway:**

```typescript
// graphql-gateway/src/index.ts
import { ApolloServer } from '@apollo/server';
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import { startStandaloneServer } from '@apollo/server/standalone';
import { GraphQLError } from 'graphql';

// Subgraph configurations
const subgraphs = [
  { name: 'crm', url: 'http://crm-service:8080/graphql' },
  { name: 'erp', url: 'http://erp-service:8080/graphql' },
  { name: 'ecommerce', url: 'http://ecommerce-service:8080/graphql' },
  { name: 'analytics', url: 'http://analytics-service:8080/graphql' },
  { name: 'users', url: 'http://user-service:8080/graphql' },
];

// Custom DataSource for authentication
class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }: any) {
    // Forward authentication headers
    if (context.token) {
      request.http.headers.set('authorization', `Bearer ${context.token}`);
    }
    
    // Add tenant ID
    if (context.tenantId) {
      request.http.headers.set('x-tenant-id', context.tenantId);
    }
    
    // Add request tracing
    request.http.headers.set('x-request-id', context.requestId);
  }
  
  didReceiveResponse({ response, request, context }: any) {
    // Log errors
    if (response.errors) {
      console.error('Subgraph errors:', response.errors);
    }
    return response;
  }
}

// Initialize gateway
const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs,
    pollIntervalInMs: 10000, // Poll for schema changes every 10s
  }),
  buildService({ url }) {
    return new AuthenticatedDataSource({ url });
  },
});

// Create Apollo Server
const server = new ApolloServer({
  gateway,
  plugins: [
    // Custom plugin for logging
    {
      async requestDidStart(requestContext) {
        console.log('Request started:', {
          query: requestContext.request.query,
          variables: requestContext.request.variables,
          operationName: requestContext.request.operationName,
        });
        
        return {
          async willSendResponse(requestContext) {
            console.log('Response sent:', {
              errors: requestContext.errors,
              data: !!requestContext.response.data,
            });
          },
        };
      },
    },
  ],
  introspection: process.env.NODE_ENV !== 'production',
  formatError: (error: GraphQLError) => {
    // Don't expose internal errors to client
    if (error.extensions?.code === 'INTERNAL_SERVER_ERROR') {
      return new GraphQLError('An internal error occurred', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }
    return error;
  },
});

// Start server
const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => {
    // Extract authentication token
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    // Extract tenant ID
    const tenantId = req.headers['x-tenant-id'];
    
    // Generate request ID
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    
    // Validate token (simplified)
    // In production, verify JWT and extract claims
    let user = null;
    if (token) {
      try {
        // Verify token with Keycloak
        const userInfo = await fetch('https://auth.yourcompany.com/realms/bac/protocol/openid-connect/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        });
        user = await userInfo.json();
      } catch (error) {
        throw new GraphQLError('Invalid authentication token', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
    }
    
    return {
      token,
      tenantId,
      requestId,
      user,
    };
  },
});

console.log(`🚀 Gateway ready at ${url}`);
```

**Example CRM Subgraph Schema:**

```graphql
# crm-service/schema.graphql
extend schema
  @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key", "@shareable", "@external"])

type Contact @key(fields: "id") {
  id: ID!
  tenantId: ID!
  firstName: String!
  lastName: String!
  email: String!
  phone: String
  company: Company
  owner: User @external
  ownerId: ID!
  createdAt: DateTime!
  updatedAt: DateTime!
  opportunities: [Opportunity!]!
  activities: [Activity!]!
}

type Company @key(fields: "id") {
  id: ID!
  tenantId: ID!
  name: String!
  domain: String
  industry: String
  employees: Int
  revenue: Float
  contacts: [Contact!]!
  opportunities: [Opportunity!]!
  owner: User @external
  ownerId: ID!
}

type Opportunity @key(fields: "id") {
  id: ID!
  tenantId: ID!
  name: String!
  amount: Float!
  stage: OpportunityStage!
  probability: Int!
  closeDate: Date!
  contact: Contact!
  contactId: ID!
  company: Company!
  companyId: ID!
  owner: User @external
  ownerId: ID!
  products: [Product!]! @external
  activities: [Activity!]!
}

enum OpportunityStage {
  QUALIFICATION
  NEEDS_ANALYSIS
  PROPOSAL
  NEGOTIATION
  CLOSED_WON
  CLOSED_LOST
}

type Activity @key(fields: "id") {
  id: ID!
  tenantId: ID!
  type: ActivityType!
  subject: String!
  description: String
  dueDate: DateTime
  completedAt: DateTime
  contact: Contact
  contactId: ID
  opportunity: Opportunity
  opportunityId: ID
  owner: User @external
  ownerId: ID!
}

enum ActivityType {
  CALL
  EMAIL
  MEETING
  TASK
  NOTE
}

# User type is defined in user-service, we just reference it
type User @key(fields: "id", resolvable: false) {
  id: ID!
}

# Product type is defined in ecommerce-service
type Product @key(fields: "id", resolvable: false) {
  id: ID!
}

type Query {
  contact(id: ID!): Contact
  contacts(
    limit: Int = 20
    offset: Int = 0
    search: String
    ownerId: ID
  ): ContactConnection!
  
  company(id: ID!): Company
  companies(
    limit: Int = 20
    offset: Int = 0
    search: String
  ): CompanyConnection!
  
  opportunity(id: ID!): Opportunity
  opportunities(
    limit: Int = 20
    offset: Int = 0
    stage: OpportunityStage
    ownerId: ID
  ): OpportunityConnection!
  
  pipelineSummary: PipelineSummary!
}

type ContactConnection {
  edges: [ContactEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type ContactEdge {
  node: Contact!
  cursor: String!
}

type CompanyConnection {
  edges: [CompanyEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type CompanyEdge {
  node: Company!
  cursor: String!
}

type OpportunityConnection {
  edges: [OpportunityEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type OpportunityEdge {
  node: Opportunity!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

type PipelineSummary {
  totalValue: Float!
  weightedValue: Float!
  byStage: [StageMetrics!]!
  forecastCategory: [ForecastMetrics!]!
}

type StageMetrics {
  stage: OpportunityStage!
  count: Int!
  totalValue: Float!
  averageAge: Int!
}

type ForecastMetrics {
  category: String!
  count: Int!
  totalValue: Float!
}

type Mutation {
  createContact(input: CreateContactInput!): Contact!
  updateContact(id: ID!, input: UpdateContactInput!): Contact!
  deleteContact(id: ID!): Boolean!
  
  createCompany(input: CreateCompanyInput!): Company!
  updateCompany(id: ID!, input: UpdateCompanyInput!): Company!
  
  createOpportunity(input: CreateOpportunityInput!): Opportunity!
  updateOpportunity(id: ID!, input: UpdateOpportunityInput!): Opportunity!
  updateOpportunityStage(id: ID!, stage: OpportunityStage!, reason: String): Opportunity!
  
  createActivity(input: CreateActivityInput!): Activity!
  completeActivity(id: ID!): Activity!
}

input CreateContactInput {
  firstName: String!
  lastName: String!
  email: String!
  phone: String
  companyId: ID
  ownerId: ID!
}

input UpdateContactInput {
  firstName: String
  lastName: String
  email: String
  phone: String
  companyId: ID
  ownerId: ID
}

input CreateCompanyInput {
  name: String!
  domain: String
  industry: String
  employees: Int
  revenue: Float
  ownerId: ID!
}

input UpdateCompanyInput {
  name: String
  domain: String
  industry: String
  employees: Int
  revenue: Float
  ownerId: ID
}

input CreateOpportunityInput {
  name: String!
  amount: Float!
  stage: OpportunityStage!
  probability: Int!
  closeDate: Date!
  contactId: ID!
  companyId: ID!
  ownerId: ID!
}

input UpdateOpportunityInput {
  name: String
  amount: Float
  stage: OpportunityStage
  probability: Int
  closeDate: Date
  contactId: ID
  companyId: ID
  ownerId: ID
}

input CreateActivityInput {
  type: ActivityType!
  subject: String!
  description: String
  dueDate: DateTime
  contactId: ID
  opportunityId: ID
  ownerId: ID!
}

scalar DateTime
scalar Date
```

### 1.3 WebSocket Server for Real-Time Updates

**Implementation:**

```typescript
// websocket-server/src/index.ts
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { parse } from 'url';
import * as jwt from 'jsonwebtoken';
import { createClient } from 'redis';

// Redis pub/sub for horizontal scaling
const redisPublisher = createClient({ url: 'redis://dragonfly-cache:6379' });
const redisSubscriber = createClient({ url: 'redis://dragonfly-cache:6379' });

await redisPublisher.connect();
await redisSubscriber.connect();

// WebSocket server
const server = createServer();
const wss = new WebSocketServer({ server, path: '/ws' });

// Connection management
const connections = new Map<string, Set<WebSocket>>();

// Subscribe to Redis channels
const subscribeToChannel = async (channel: string) => {
  await redisSubscriber.subscribe(channel, (message) => {
    // Broadcast to all connected clients subscribed to this channel
    const clients = connections.get(channel);
    if (clients) {
      const data = JSON.stringify({ channel, data: JSON.parse(message) });
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      });
    }
  });
};

wss.on('connection', async (ws: WebSocket, request) => {
  const { query } = parse(request.url!, true);
  const token = query.token as string;
  
  // Authenticate
  let user: any;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET!);
  } catch (error) {
    ws.close(4001, 'Unauthorized');
    return;
  }
  
  const tenantId = user.tenant_id;
  const userId = user.sub;
  
  console.log(`WebSocket connection established for user ${userId}`);
  
  // Store connection
  const userChannels = new Set<string>();
  
  ws.on('message', async (data) => {
    const message = JSON.parse(data.toString());
    
    switch (message.type) {
      case 'subscribe':
        const channel = `${tenantId}:${message.channel}`;
        
        // Add to connections map
        if (!connections.has(channel)) {
          connections.set(channel, new Set());
          await subscribeToChannel(channel);
        }
        connections.get(channel)!.add(ws);
        userChannels.add(channel);
        
        ws.send(JSON.stringify({ 
          type: 'subscribed', 
          channel: message.channel 
        }));
        break;
      
      case 'unsubscribe':
        const unsubChannel = `${tenantId}:${message.channel}`;
        connections.get(unsubChannel)?.delete(ws);
        userChannels.delete(unsubChannel);
        
        ws.send(JSON.stringify({ 
          type: 'unsubscribed', 
          channel: message.channel 
        }));
        break;
      
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;
    }
  });
  
  ws.on('close', () => {
    console.log(`WebSocket connection closed for user ${userId}`);
    
    // Remove from all channels
    userChannels.forEach((channel) => {
      connections.get(channel)?.delete(ws);
    });
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
  
  // Send welcome message
  ws.send(JSON.stringify({ 
    type: 'connected', 
    timestamp: Date.now(),
    userId 
  }));
});

// Health check endpoint
server.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
  }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`WebSocket server listening on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing connections...');
  
  wss.clients.forEach((client) => {
    client.close(1000, 'Server shutting down');
  });
  
  await redisPublisher.quit();
  await redisSubscriber.quit();
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
```

**Kubernetes Deployment:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: websocket-server
  namespace: api-gateway
spec:
  replicas: 5
  selector:
    matchLabels:
      app: websocket-server
  template:
    metadata:
      labels:
        app: websocket-server
    spec:
      containers:
      - name: server
        image: your-registry/websocket-server:latest
        ports:
        - containerPort: 8080
          name: websocket
        env:
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: secret
        - name: REDIS_URL
          value: "redis://dragonfly-cache:6379"
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: websocket-server
  namespace: api-gateway
spec:
  selector:
    app: websocket-server
  ports:
  - port: 8080
    targetPort: 8080
    protocol: TCP
  type: ClusterIP
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 3600
```

---

## 2. Security Architecture

### 2.1 Zero-Trust Network Architecture

**Principles:**
1. **Never Trust, Always Verify:** Authenticate and authorize every request
2. **Least Privilege Access:** Minimum permissions required
3. **Micro-Segmentation:** Network isolation at service level
4. **Assume Breach:** Monitor and detect anomalies continuously

**Implementation with Istio Service Mesh:**

```yaml
# istio-config/peer-authentication.yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT  # Enforce mTLS for all service-to-service communication
---
# istio-config/authorization-policy.yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: crm-service-authz
  namespace: crm
spec:
  selector:
    matchLabels:
      app: crm-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/api-gateway/sa/kong"
        - "cluster.local/ns/ai-services/sa/mcp-orchestrator"
    to:
    - operation:
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
        paths: ["/v1/*"]
    when:
    - key: request.headers[x-tenant-id]
      notValues: [""]
---
# Network Policy for additional layer
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: crm-service-netpol
  namespace: crm
spec:
  podSelector:
    matchLabels:
      app: crm-service
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: api-gateway
    - namespaceSelector:
        matchLabels:
          name: ai-services
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: database
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - namespaceSelector:
        matchLabels:
          name: cache
    ports:
    - protocol: TCP
      port: 6379
  - to:
    - namespaceSelector:
        matchLabels:
          name: event-streaming
    ports:
    - protocol: TCP
      port: 9092
```

### 2.2 Identity and Access Management (IAM)

**Keycloak Configuration:**

```yaml
# keycloak/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: keycloak
  namespace: auth
spec:
  replicas: 3
  selector:
    matchLabels:
      app: keycloak
  template:
    metadata:
      labels:
        app: keycloak
    spec:
      containers:
      - name: keycloak
        image: quay.io/keycloak/keycloak:23.0
        args:
        - start
        - --optimized
        - --hostname=auth.yourcompany.com
        - --http-enabled=true
        - --proxy=edge
        env:
        - name: KC_DB
          value: postgres
        - name: KC_DB_URL
          value: jdbc:postgresql://keycloak-db:5432/keycloak
        - name: KC_DB_USERNAME
          valueFrom:
            secretKeyRef:
              name: keycloak-db-secret
              key: username
        - name: KC_DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: keycloak-db-secret
              key: password
        - name: KEYCLOAK_ADMIN
          value: admin
        - name: KEYCLOAK_ADMIN_PASSWORD
          valueFrom:
            secretKeyRef:
              name: keycloak-admin-secret
              key: password
        - name: KC_FEATURES
          value: token-exchange,admin-fine-grained-authz
        - name: KC_HEALTH_ENABLED
          value: "true"
        - name: KC_METRICS_ENABLED
          value: "true"
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9000
          name: metrics
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
          initialDelaySeconds: 120
          periodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: keycloak
  namespace: auth
spec:
  selector:
    app: keycloak
  ports:
  - port: 8080
    targetPort: 8080
    name: http
  - port: 9000
    targetPort: 9000
    name: metrics
  type: ClusterIP
```

**Realm Configuration (Terraform):**

```hcl
# keycloak-config/realm.tf
resource "keycloak_realm" "bac" {
  realm   = "bac"
  enabled = true
  
  display_name = "BAC Platform"
  
  # Token settings
  access_token_lifespan = "5m"
  sso_session_idle_timeout = "30m"
  sso_session_max_lifespan = "10h"
  
  # Password policy
  password_policy = "upperCase(1) and lowerCase(1) and digits(1) and specialChars(1) and length(12) and notUsername(undefined)"
  
  # MFA
  otp_policy {
    type      = "totp"
    algorithm = "HmacSHA256"
    digits    = 6
    period    = 30
  }
  
  # Security defenses
  brute_force_protected           = true
  permanent_lockout               = false
  max_failure_wait_seconds        = 900
  minimum_quick_login_wait_seconds = 60
  wait_increment_seconds          = 60
  quick_login_check_milli_seconds = 1000
  max_delta_time_seconds          = 43200
  failure_factor                  = 30
}

# Client for API Gateway
resource "keycloak_openid_client" "api_gateway" {
  realm_id  = keycloak_realm.bac.id
  client_id = "bac-api"
  
  name    = "BAC API Gateway"
  enabled = true
  
  access_type = "CONFIDENTIAL"
  valid_redirect_uris = [
    "https://api.yourcompany.com/auth/callback",
    "https://app.yourcompany.com/auth/callback"
  ]
  web_origins = [
    "https://api.yourcompany.com",
    "https://app.yourcompany.com"
  ]
  
  standard_flow_enabled = true
  implicit_flow_enabled = false
  direct_access_grants_enabled = false
  service_accounts_enabled = true
  
  # JWT settings
  use_refresh_tokens = true
  refresh_token_max_reuse = 0
}

# Roles
resource "keycloak_role" "admin" {
  realm_id    = keycloak_realm.bac.id
  name        = "admin"
  description = "Administrator role with full access"
}

resource "keycloak_role" "user" {
  realm_id    = keycloak_realm.bac.id
  name        = "user"
  description = "Standard user role"
}

resource "keycloak_role" "api_access" {
  realm_id    = keycloak_realm.bac.id
  client_id   = keycloak_openid_client.api_gateway.id
  name        = "api-access"
  description = "API access role"
}

# User federation (LDAP/AD integration example)
resource "keycloak_ldap_user_federation" "ldap" {
  name                    = "corporate-ldap"
  realm_id                = keycloak_realm.bac.id
  enabled                 = true
  
  username_ldap_attribute = "uid"
  rdn_ldap_attribute      = "uid"
  uuid_ldap_attribute     = "entryUUID"
  user_object_classes     = ["inetOrgPerson", "organizationalPerson"]
  
  connection_url          = "ldaps://ldap.yourcompany.com:636"
  users_dn                = "ou=users,dc=yourcompany,dc=com"
  bind_dn                 = "cn=keycloak,ou=services,dc=yourcompany,dc=com"
  bind_credential         = var.ldap_bind_password
  
  search_scope            = "SUBTREE"
  
  # Sync settings
  batch_size_for_sync     = 1000
  full_sync_period        = 604800  # Weekly
  changed_sync_period     = 86400   # Daily
  
  cache_policy            = "DEFAULT"
}
```

### 2.3 Encryption Standards

**At Rest:**
- **Algorithm:** AES-256-GCM
- **Key Management:** HashiCorp Vault with automatic rotation
- **Databases:** Transparent Data Encryption (TDE) enabled
- **Object Storage:** Server-side encryption with customer keys (SSE-C)
- **Backups:** Encrypted before storage

**In Transit:**
- **Protocol:** TLS 1.3 only
- **Cipher Suites:** ECDHE-RSA-AES256-GCM-SHA384, ECDHE-RSA-CHACHA20-POLY1305
- **Certificate Management:** Let's Encrypt with cert-manager auto-renewal
- **Service Mesh:** Mutual TLS (mTLS) for all internal communication

**Vault Configuration:**

```hcl
# vault-config/main.tf
resource "vault_mount" "transit" {
  path = "transit"
  type = "transit"
  description = "Transit encryption engine for application-level encryption"
}

resource "vault_transit_secret_backend_key" "database" {
  backend = vault_mount.transit.path
  name    = "database-encryption"
  
  type                   = "aes256-gcm96"
  deletion_allowed       = false
  exportable             = false
  allow_plaintext_backup = false
  
  auto_rotate_period = 2592000  # 30 days
}

resource "vault_transit_secret_backend_key" "pii" {
  backend = vault_mount.transit.path
  name    = "pii-encryption"
  
  type                   = "aes256-gcm96"
  deletion_allowed       = false
  exportable             = false
  allow_plaintext_backup = false
  
  auto_rotate_period = 2592000  # 30 days
}

# Database credentials rotation
resource "vault_database_secret_backend_connection" "postgres" {
  backend       = vault_mount.database.path
  name          = "yugabytedb"
  allowed_roles = ["readonly", "readwrite", "admin"]
  
  postgresql {
    connection_url = "postgresql://{{username}}:{{password}}@yugabytedb:5433/bac"
    username       = "vault"
    password       = var.db_vault_password
  }
}

resource "vault_database_secret_backend_role" "readwrite" {
  backend             = vault_mount.database.path
  name                = "readwrite"
  db_name             = vault_database_secret_backend_connection.postgres.name
  creation_statements = [
    "CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}';",
    "GRANT readwrite TO \"{{name}}\";"
  ]
  
  default_ttl = 3600    # 1 hour
  max_ttl     = 86400   # 24 hours
}
```

### 2.4 Vulnerability Management

**Automated Scanning:**

```yaml
# security/trivy-scan.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: trivy-image-scan
  namespace: security
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: trivy
            image: aquasec/trivy:latest
            command:
            - /bin/sh
            - -c
            - |
              # Scan all images in use
              kubectl get pods --all-namespaces -o jsonpath="{.items[*].spec.containers[*].image}" | \
              tr ' ' '\n' | sort -u | while read image; do
                echo "Scanning $image"
                trivy image --severity HIGH,CRITICAL --exit-code 1 $image || \
                echo "ALERT: Vulnerabilities found in $image"
              done
          restartPolicy: OnFailure
---
# SIEM Integration with Wazuh
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: wazuh-agent
  namespace: security
spec:
  selector:
    matchLabels:
      app: wazuh-agent
  template:
    metadata:
      labels:
        app: wazuh-agent
    spec:
      hostNetwork: true
      hostPID: true
      hostIPC: true
      containers:
      - name: wazuh
        image: wazuh/wazuh-agent:latest
        env:
        - name: WAZUH_MANAGER
          value: "wazuh-manager.security.svc.cluster.local"
        - name: WAZUH_AGENT_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        securityContext:
          privileged: true
        volumeMounts:
        - name: host-root
          mountPath: /host
          readOnly: true
        - name: var-run
          mountPath: /var/run
        - name: sys
          mountPath: /sys
          readOnly: true
      volumes:
      - name: host-root
        hostPath:
          path: /
      - name: var-run
        hostPath:
          path: /var/run
      - name: sys
        hostPath:
          path: /sys
```

**Compliance Scanning:**

```python
# security/compliance-checker.py
#!/usr/bin/env python3
"""
Automated compliance checker for SOC2, ISO 27001, GDPR, HIPAA
Runs daily and reports compliance status
"""

import kubernetes
import requests
import json
from datetime import datetime

class ComplianceChecker:
    def __init__(self):
        kubernetes.config.load_incluster_config()
        self.v1 = kubernetes.client.CoreV1Api()
        self.apps_v1 = kubernetes.client.AppsV1Api()
        
    def check_encryption_at_rest(self):
        """Verify all PVCs are encrypted"""
        pvcs = self.v1.list_persistent_volume_claim_for_all_namespaces()
        unencrypted = []
        
        for pvc in pvcs.items:
            # Check for encryption annotation
            annotations = pvc.metadata.annotations or {}
            if not annotations.get('encrypted', '').lower() == 'true':
                unencrypted.append(f"{pvc.metadata.namespace}/{pvc.metadata.name}")
        
        return {
            'compliant': len(unencrypted) == 0,
            'issues': unencrypted,
            'requirement': 'SOC2 CC6.1, ISO 27001 A.10.1.1'
        }
    
    def check_mtls_enabled(self):
        """Verify mTLS is enforced cluster-wide"""
        # Check Istio PeerAuthentication
        custom_api = kubernetes.client.CustomObjectsApi()
        
        try:
            peer_auth = custom_api.get_namespaced_custom_object(
                group="security.istio.io",
                version="v1beta1",
                namespace="istio-system",
                plural="peerauthentications",
                name="default"
            )
            
            mode = peer_auth.get('spec', {}).get('mtls', {}).get('mode', '')
            compliant = mode == 'STRICT'
            
            return {
                'compliant': compliant,
                'current_mode': mode,
                'requirement': 'SOC2 CC6.6, ISO 27001 A.13.1.1'
            }
        except:
            return {
                'compliant': False,
                'error': 'PeerAuthentication not found',
                'requirement': 'SOC2 CC6.6, ISO 27001 A.13.1.1'
            }
    
    def check_least_privilege(self):
        """Verify no pods run as root"""
        pods = self.v1.list_pod_for_all_namespaces()
        root_pods = []
        
        for pod in pods.items:
            for container in pod.spec.containers:
                security_context = container.security_context
                if security_context and security_context.run_as_user == 0:
                    root_pods.append(f"{pod.metadata.namespace}/{pod.metadata.name}")
        
        return {
            'compliant': len(root_pods) == 0,
            'issues': root_pods,
            'requirement': 'SOC2 CC6.3, ISO 27001 A.9.2.3'
        }
    
    def check_data_retention(self):
        """Verify data retention policies are in place"""
        # Check if TTL indexes exist in databases
        # This is simplified - in practice, query each database
        
        checks = {
            'logs_retention': self.check_loki_retention(),
            'metrics_retention': self.check_prometheus_retention(),
            'database_backups': self.check_backup_retention()
        }
        
        all_compliant = all(c['compliant'] for c in checks.values())
        
        return {
            'compliant': all_compliant,
            'checks': checks,
            'requirement': 'GDPR Art. 5(1)(e), HIPAA §164.316(b)(2)'
        }
    
    def check_audit_logging(self):
        """Verify audit logs are enabled and retained"""
        # Check Kubernetes audit policy
        try:
            config = self.v1.read_namespaced_config_map(
                name="audit-policy",
                namespace="kube-system"
            )
            
            return {
                'compliant': True,
                'requirement': 'SOC2 CC7.2, ISO 27001 A.12.4.1, HIPAA §164.312(b)'
            }
        except:
            return {
                'compliant': False,
                'error': 'Audit policy not configured',
                'requirement': 'SOC2 CC7.2, ISO 27001 A.12.4.1, HIPAA §164.312(b)'
            }
    
    def check_access_reviews(self):
        """Verify periodic access reviews are conducted"""
        # Check if RBAC reviews have been done in last 90 days
        # This would integrate with your access review system
        
        return {
            'compliant': True,  # Placeholder
            'last_review': '2025-10-15',
            'requirement': 'SOC2 CC6.2, ISO 27001 A.9.2.5'
        }
    
    def generate_report(self):
        """Generate compliance report"""
        checks = {
            'Encryption at Rest': self.check_encryption_at_rest(),
            'mTLS Enforcement': self.check_mtls_enabled(),
            'Least Privilege': self.check_least_privilege(),
            'Data Retention': self.check_data_retention(),
            'Audit Logging': self.check_audit_logging(),
            'Access Reviews': self.check_access_reviews()
        }
        
        report = {
            'timestamp': datetime.utcnow().isoformat(),
            'overall_compliant': all(c['compliant'] for c in checks.values()),
            'checks': checks,
            'compliance_score': sum(1 for c in checks.values() if c['compliant']) / len(checks) * 100
        }
        
        # Send to monitoring system
        self.send_to_prometheus(report)
        
        # Generate PDF report
        self.generate_pdf_report(report)
        
        return report
    
    def send_to_prometheus(self, report):
        """Push metrics to Prometheus Pushgateway"""
        metrics = f"""
# HELP compliance_score Overall compliance score percentage
# TYPE compliance_score gauge
compliance_score {report['compliance_score']}

# HELP compliance_check_status Individual check status (1=compliant, 0=non-compliant)
# TYPE compliance_check_status gauge
"""
        for check_name, check_result in report['checks'].items():
            status = 1 if check_result['compliant'] else 0
            safe_name = check_name.lower().replace(' ', '_')
            metrics += f'compliance_check_status{{check="{safe_name}"}} {status}\n'
        
        requests.post(
            'http://pushgateway.monitoring:9091/metrics/job/compliance_checker',
            data=metrics
        )

if __name__ == '__main__':
    checker = ComplianceChecker()
    report = checker.generate_report()
    
    print(json.dumps(report, indent=2))
    
    if not report['overall_compliant']:
        print("\n❌ COMPLIANCE FAILURES DETECTED")
        for check_name, result in report['checks'].items():
            if not result['compliant']:
                print(f"\n{check_name}:")
                print(f"  Requirement: {result['requirement']}")
                if 'issues' in result:
                    print(f"  Issues: {', '.join(result['issues'])}")
        exit(1)
    else:
        print("\n✅ ALL COMPLIANCE CHECKS PASSED")
```

---

## 3. Infrastructure & DevOps

### 3.1 Kubernetes Cluster Architecture

**Multi-Cluster, Multi-Region Design:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    GLOBAL LOAD BALANCER                         │
│              (Cloudflare / AWS Global Accelerator)              │
└────────┬────────────────────────────────────────┬───────────────┘
         │                                        │
         ▼                                        ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│   US-EAST-1 REGION      │         │   EU-WEST-1 REGION      │
│                         │         │                         │
│  ┌───────────────────┐  │         │  ┌───────────────────┐  │
│  │  Production       │  │         │  │  Production       │  │
│  │  Cluster          │  │         │  │  Cluster          │  │
│  │  ───────────────  │  │         │  │  ───────────────  │  │
│  │  • 50 nodes       │  │         │  │  • 50 nodes       │  │
│  │  • 3 AZs          │  │         │  │  • 3 AZs          │  │
│  │  • Active-Active  │  │         │  │  • Active-Active  │  │
│  └───────────────────┘  │         │  └───────────────────┘  │
│                         │         │                         │
│  ┌───────────────────┐  │         │  ┌───────────────────┐  │
│  │  Staging Cluster  │  │         │  │  Staging Cluster  │  │
│  │  • 10 nodes       │  │         │  │  • 10 nodes       │  │
│  └───────────────────┘  │         │  └───────────────────┘  │
└─────────────────────────┘         └─────────────────────────┘
```

**Cluster Specification:**

```yaml
# terraform/kubernetes/cluster.tf
module "eks_us_east_1_prod" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"
  
  cluster_name    = "bac-prod-us-east-1"
  cluster_version = "1.28"
  
  vpc_id     = module.vpc_us_east_1.vpc_id
  subnet_ids = module.vpc_us_east_1.private_subnets
  
  # Cluster endpoint access
  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true
  
  cluster_endpoint_public_access_cidrs = [
    "YOUR_OFFICE_IP/32"
  ]
  
  # Add-ons
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }
  
  # Node groups
  eks_managed_node_groups = {
    # General purpose nodes
    general = {
      name = "general-purpose"
      
      instance_types = ["m6i.2xlarge"]  # 8 vCPU, 32 GB RAM
      
      min_size     = 10
      max_size     = 100
      desired_size = 30
      
      labels = {
        role = "general"
      }
      
      taints = []
      
      disk_size = 200
      disk_type = "gp3"
      disk_iops = 3000
      disk_throughput = 250
    }
    
    # Compute-intensive nodes (for analytics, ML)
    compute = {
      name = "compute-optimized"
      
      instance_types = ["c6i.4xlarge"]  # 16 vCPU, 32 GB RAM
      
      min_size     = 5
      max_size     = 50
      desired_size = 10
      
      labels = {
        role = "compute"
      }
      
      taints = [{
        key    = "compute"
        value  = "true"
        effect = "NoSchedule"
      }]
      
      disk_size = 500
      disk_type = "gp3"
    }
    
    # Memory-intensive nodes (for caching, databases)
    memory = {
      name = "memory-optimized"
      
      instance_types = ["r6i.2xlarge"]  # 8 vCPU, 64 GB RAM
      
      min_size     = 5
      max_size     = 30
      desired_size = 10
      
      labels = {
        role = "memory"
      }
      
      taints = [{
        key    = "memory"
        value  = "true"
        effect = "NoSchedule"
      }]
      
      disk_size = 500
      disk_type = "gp3"
    }
    
    # GPU nodes (for ML training/inference)
    gpu = {
      name = "gpu-nodes"
      
      instance_types = ["g5.4xlarge"]  # 16 vCPU, 64 GB RAM, 1x NVIDIA A10G
      
      min_size     = 0
      max_size     = 20
      desired_size = 2
      
      labels = {
        role = "gpu"
        "nvidia.com/gpu" = "true"
      }
      
      taints = [{
        key    = "nvidia.com/gpu"
        value  = "true"
        effect = "NoSchedule"
      }]
      
      disk_size = 1000
      disk_type = "gp3"
    }
  }
  
  # Cluster security
  node_security_group_additional_rules = {
    ingress_self_all = {
      description = "Node to node all ports/protocols"
      protocol    = "-1"
      from_port   = 0
      to_port     = 0
      type        = "ingress"
      self        = true
    }
    
    egress_all = {
      description      = "Node all egress"
      protocol         = "-1"
      from_port        = 0
      to_port          = 0
      type             = "egress"
      cidr_blocks      = ["0.0.0.0/0"]
      ipv6_cidr_blocks = ["::/0"]
    }
  }
  
  # OIDC provider for IRSA (IAM Roles for Service Accounts)
  enable_irsa = true
  
  tags = {
    Environment = "production"
    Terraform   = "true"
    Cluster     = "bac-prod-us-east-1"
  }
}
```

### 3.2 GitOps with ArgoCD

**ArgoCD Installation:**

```yaml
# argocd/values.yaml
global:
  image:
    repository: quay.io/argoproj/argocd
    tag: v2.9.3

controller:
  replicas: 3
  resources:
    requests:
      cpu: 1000m
      memory: 2Gi
    limits:
      cpu: 2000m
      memory: 4Gi

server:
  replicas: 3
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 1Gi
  
  ingress:
    enabled: true
    ingressClassName: nginx
    annotations:
      cert-manager.io/cluster-issuer: letsencrypt-prod
      nginx.ingress.kubernetes.io/ssl-redirect: "true"
      nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    hosts:
      - argocd.yourcompany.com
    tls:
      - secretName: argocd-tls
        hosts:
          - argocd.yourcompany.com

repoServer:
  replicas: 3
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 1000m
      memory: 2Gi

redis:
  enabled: true
  ha:
    enabled: true

configs:
  secret:
    createSecret: false  # Use external secret
  
  cm:
    # Repositories
    repositories: |
      - type: git
        url: https://github.com/your-company/bac-platform
      - type: helm
        name: stable
        url: https://charts.helm.sh/stable
    
    # Resource customizations
    resource.customizations: |
      argoproj.io/Application:
        health.lua: |
          hs = {}
          hs.status = "Progressing"
          hs.message = ""
          if obj.status ~= nil then
            if obj.status.health ~= nil then
              hs.status = obj.status.health.status
              if obj.status.health.message ~= nil then
                hs.message = obj.status.health.message
              end
            end
          end
          return hs
```

**Application of Applications Pattern:**

```yaml
# argocd/apps/root-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: root-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-company/bac-platform
    targetRevision: HEAD
    path: argocd/apps
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
---
# argocd/apps/platform-apps.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: istio-system
  namespace: argocd
spec:
  project: platform
  source:
    repoURL: https://istio-release.storage.googleapis.com/charts
    chart: istiod
    targetRevision: 1.20.0
    helm:
      values: |
        global:
          meshID: bac-mesh
          network: bac-network
        pilot:
          autoscaleEnabled: true
          autoscaleMin: 3
          autoscaleMax: 10
  destination:
    server: https://kubernetes.default.svc
    namespace: istio-system
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: monitoring-stack
  namespace: argocd
spec:
  project: platform
  source:
    repoURL: https://github.com/your-company/bac-platform
    targetRevision: HEAD
    path: monitoring
  destination:
    server: https://kubernetes.default.svc
    namespace: monitoring
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: crm-service
  namespace: argocd
spec:
  project: services
  source:
    repoURL: https://github.com/your-company/bac-platform
    targetRevision: HEAD
    path: services/crm
    helm:
      parameters:
        - name: image.tag
          value: "{{CI_COMMIT_SHA}}"
        - name: replicaCount
          value: "5"
  destination:
    server: https://kubernetes.default.svc
    namespace: crm
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

### 3.3 CI/CD Pipelines

**GitHub Actions Workflow:**

```yaml
# .github/workflows/build-deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main, develop]
    paths:
      - 'services/**'
      - '.github/workflows/**'
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # Detect changed services
  changes:
    runs-on: ubuntu-latest
    outputs:
      services: ${{ steps.filter.outputs.changes }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v2
        id: filter
        with:
          filters: |
            crm:
              - 'services/crm/**'
            erp:
              - 'services/erp/**'
            ecommerce:
              - 'services/ecommerce/**'
            analytics:
              - 'services/analytics/**'
  
  # Build and test
  build:
    needs: changes
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: ${{ fromJSON(needs.changes.outputs.services) }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      
      - name: Cache Go modules
        uses: actions/cache@v3
        with:
          path: |
            ~/.cache/go-build
            ~/go/pkg/mod
          key: ${{ runner.os }}-go-${{ hashFiles('**/go.sum') }}
      
      - name: Run tests
        working-directory: ./services/${{ matrix.service }}
        run: |
          go test -v -race -coverprofile=coverage.out ./...
          go tool cover -html=coverage.out -o coverage.html
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./services/${{ matrix.service }}/coverage.out
          flags: ${{ matrix.service }}
      
      - name: Run linter
        uses: golangci/golangci-lint-action@v3
        with:
          version: latest
          working-directory: ./services/${{ matrix.service }}
      
      - name: Security scan
        uses: securego/gosec@master
        with:
          args: '-no-fail -fmt json -out gosec-report.json ./...'
          working-directory: ./services/${{ matrix.service }}
      
      - name: Build binary
        working-directory: ./services/${{ matrix.service }}
        run: |
          CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
            -ldflags="-w -s -X main.version=${{ github.sha }}" \
            -o bin/${{ matrix.service }} \
            ./cmd/server
      
      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: ./services/${{ matrix.service }}
          push: ${{ github.event_name != 'pull_request' }}
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/${{ matrix.service }}:${{ github.sha }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/${{ matrix.service }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
      
      - name: Scan image for vulnerabilities
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/${{ matrix.service }}:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
  
  # Deploy to staging
  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    environment:
      name: staging
      url: https://staging-api.yourcompany.com
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Update image tag in ArgoCD
        run: |
          # Update image tag in Helm values
          yq eval '.image.tag = "${{ github.sha }}"' -i \
            argocd/apps/staging/values.yaml
          
          git config user.name github-actions
          git config user.email github-actions@github.com
          git add argocd/apps/staging/values.yaml
          git commit -m "chore: update staging to ${{ github.sha }}"
          git push
      
      - name: Wait for ArgoCD sync
        run: |
          # Wait for ArgoCD to sync
          sleep 60
      
      - name: Run smoke tests
        run: |
          ./scripts/smoke-tests.sh staging
  
  # Deploy to production
  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://api.yourcompany.com
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Create release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: v${{ github.run_number }}
          release_name: Release v${{ github.run_number }}
          body: |
            Release ${{ github.sha }}
          draft: false
          prerelease: false
      
      - name: Update image tag in ArgoCD
        run: |
          yq eval '.image.tag = "${{ github.sha }}"' -i \
            argocd/apps/production/values.yaml
          
          git config user.name github-actions
          git config user.email github-actions@github.com
          git add argocd/apps/production/values.yaml
          git commit -m "chore: update production to ${{ github.sha }}"
          git push
      
      - name: Wait for ArgoCD sync
        run: |
          sleep 120
      
      - name: Run integration tests
        run: |
          ./scripts/integration-tests.sh production
      
      - name: Notify Slack
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Deployed ${{ github.sha }} to production'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

**Tekton Pipeline (Alternative):**

```yaml
# tekton/pipeline.yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: build-deploy-service
spec:
  params:
    - name: git-url
      type: string
    - name: git-revision
      type: string
      default: main
    - name: service-name
      type: string
    - name: image-url
      type: string
    - name: deployment-namespace
      type: string
  
  workspaces:
    - name: shared-workspace
    - name: docker-credentials
  
  tasks:
    # Clone repository
    - name: fetch-repository
      taskRef:
        name: git-clone
      workspaces:
        - name: output
          workspace: shared-workspace
      params:
        - name: url
          value: $(params.git-url)
        - name: revision
          value: $(params.git-revision)
    
    # Run tests
    - name: run-tests
      runAfter: [fetch-repository]
      taskRef:
        name: golang-test
      workspaces:
        - name: source
          workspace: shared-workspace
      params:
        - name: package
          value: ./services/$(params.service-name)/...
        - name: flags
          value: -v -race -coverprofile=coverage.out
    
    # Security scan
    - name: security-scan
      runAfter: [run-tests]
      taskRef:
        name: gosec
      workspaces:
        - name: source
          workspace: shared-workspace
      params:
        - name: path
          value: ./services/$(params.service-name)
    
    # Build image
    - name: build-image
      runAfter: [security-scan]
      taskRef:
        name: kaniko
      workspaces:
        - name: source
          workspace: shared-workspace
        - name: dockerconfig
          workspace: docker-credentials
      params:
        - name: IMAGE
          value: $(params.image-url):$(params.git-revision)
        - name: CONTEXT
          value: ./services/$(params.service-name)
        - name: DOCKERFILE
          value: ./services/$(params.service-name)/Dockerfile
    
    # Scan image
    - name: scan-image
      runAfter: [build-image]
      taskRef:
        name: trivy-scanner
      params:
        - name: IMAGE_REF
          value: $(params.image-url):$(params.git-revision)
        - name: SEVERITY
          value: HIGH,CRITICAL
    
    # Deploy
    - name: deploy
      runAfter: [scan-image]
      taskRef:
        name: argocd-sync
      params:
        - name: application
          value: $(params.service-name)
        - name: revision
          value: $(params.git-revision)
        - name: flags
          value: --prune --force
```

Due to length constraints, I need to continue in another file. Would you like me to:
1. Continue with sections 4-10 in a new file?
2. Create specific focused documents for each remaining section?

Let me know how you'd like to proceed!
