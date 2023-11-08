import * as aws from "@pulumi/aws"
import * as eks from "@pulumi/eks"
import * as k8s from "@pulumi/kubernetes"
import * as random from "@pulumi/random"
import S3ServiceAccount from "./S3ServiceAccount"
import TraefikRoute from "./TraefikRoute"

// Create a Kubernetes cluster.
const cluster = new eks.Cluster("mlplatform-eks", {
  createOidcProvider: true,
  // free tier, but it is not stable
  // desiredCapacity: 2,
  // instanceType: "t3.micro",
})

// Install Traefik
const traefik = new k8s.helm.v3.Chart(
  "traefik",
  {
    chart: "traefik",
    fetchOpts: { repo: "https://traefik.github.io/charts" },
  },
  { provider: cluster.provider }
)

// Create PostgreSQL database for MLFlow - this will save model metadata
const dbPassword = new random.RandomPassword("mlplatform-db-password", {
  length: 16,
  special: false,
})
const db = new aws.rds.Instance("mlflow-db", {
  allocatedStorage: 10,
  engine: "postgres",
  engineVersion: "15.3",
  instanceClass: "db.t3.micro",
  dbName: "mlflow",
  password: dbPassword.result,
  skipFinalSnapshot: true,
  vpcSecurityGroupIds: [
    cluster.clusterSecurityGroup.id,
    cluster.nodeSecurityGroup.id,
  ],
  username: "postgres",
})

// Create S3 bucket for MLFlow
const mlflowBucket = new aws.s3.BucketV2("mlflow-bucket")
const mlflowBucketOwnershipControls = new aws.s3.BucketOwnershipControls(
  "mlflowBucketOwnershipControls",
  {
    bucket: mlflowBucket.id,
    rule: {
      objectOwnership: "BucketOwnerPreferred",
    },
  }
)
const mlflowBucketPublicAccessBlock = new aws.s3.BucketPublicAccessBlock(
  "mlflowBucketPublicAccessBlock",
  {
    bucket: mlflowBucket.id,
    blockPublicAcls: false,
    blockPublicPolicy: false,
    ignorePublicAcls: false,
    restrictPublicBuckets: false,
  }
)
const mlflowBucketAclV2 = new aws.s3.BucketAclV2(
  "mlflowBucketAclV2",
  {
    bucket: mlflowBucket.id,
    acl: "public-read-write",
  },
  {
    dependsOn: [mlflowBucketOwnershipControls, mlflowBucketPublicAccessBlock],
  }
)

// Install MLFlow
const mlflowNamespace = new k8s.core.v1.Namespace(
  "mlflow-namespace",
  {
    metadata: { name: "mlflow" },
  },
  { provider: cluster.provider }
)

const mlflowServiceAccount = new S3ServiceAccount(
  "mlflow-service-account",
  {
    namespace: "default",
    oidcProvider: cluster.core.oidcProvider!,
    readOnly: false,
  },
  { provider: cluster.provider }
)

const mlflow = new k8s.helm.v3.Chart(
  "mlflow",
  {
    chart: "mlflow",

    values: {
      backendStore: {
        postgres: {
          username: db.username,
          password: db.password,
          host: db.address,
          port: db.port,
          database: "mlflow",
        },
      },
      defaultArtifactRoot: mlflowBucket.bucket.apply(
        (bucketName: string) => `s3://${bucketName}`
      ),
      serviceAccount: {
        create: false,
        name: mlflowServiceAccount.name,
      },
    },
    fetchOpts: { repo: "https://larribas.me/helm-charts" },
    // New version of MLFlow, but need to adjust configuration
    // fetchOpts: { repo: "https://community-charts.github.io/helm-charts" },
  },
  { provider: cluster.provider }
)

// Expose MLFlow in Traefik as /mlflow
new TraefikRoute(
  "mlflow-route",
  {
    prefix: "/mlflow",
    service: mlflow.getResource("v1/Service", "mlflow"),
    namespace: "default",
  },
  { provider: cluster.provider }
)

// Service account for models with read only access to models
const modelsServiceAccount = new S3ServiceAccount(
  "models-service-account",
  {
    namespace: "default",
    oidcProvider: cluster.core.oidcProvider!,
    readOnly: true,
  },
  { provider: cluster.provider }
)

// Set ml.mycompany.com DNS record in Route53, skip for now as I don't have domain.
// new aws.route53.Record("record", {
//   zoneId: <YOUR_ZONE_ID>,
//   name: "ml.yourcompany.com",
//  type: "CNAME",
//  ttl: 300,
//  records: [traefik.getResource('v1/Service', 'default/traefik').status.loadBalancer.ingress[0].hostname],
// });

export const kubeconfig = cluster.kubeconfig
export const modelsServiceAccountName = modelsServiceAccount.name
export const traefik_hn = traefik.getResource("v1/Service", "default/traefik")
  .status.loadBalancer.ingress[0].hostname
export const mlflowTrackingURI = traefik_hn.apply((hn) => `http://${hn}/mlflow`)
