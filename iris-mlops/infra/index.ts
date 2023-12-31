import * as pulumi from '@pulumi/pulumi';
import * as awsx from '@pulumi/awsx';
import * as k8s from '@pulumi/kubernetes';
import * as kx from '@pulumi/kubernetesx';
import TraefikRoute from './TraefikRoute';

const config = new pulumi.Config();
const baseStack = new pulumi.StackReference(config.require('baseStackName'))

const provider = new k8s.Provider('provider', {
  kubeconfig: baseStack.requireOutput('kubeconfig'),
})

const image = awsx.ecr.buildAndPushImage('iris-mlops-image', {
  context: '../',
});

const podBuilder = new kx.PodBuilder({
  containers: [{
    image: image.imageValue,
    ports: { http: 80 },
    env: {
      'LISTEN_PORT': '80',
      'MLFLOW_TRACKING_URI': baseStack.requireOutput('mlflowTrackingURI'),
      'MLFLOW_RUN_ID': config.require('runID'),
    }
  }],
  serviceAccountName: baseStack.requireOutput('modelsServiceAccountName'),
});

const deployment = new kx.Deployment('iris-mlops-serving', {
  spec: podBuilder.asDeploymentSpec({ replicas: 3 }) 
}, { provider });

const service = deployment.createService();


// Expose model in Traefik 
new TraefikRoute('iris-mlops', {
  prefix: '/models/iris-mlops',
  service,
  namespace: 'default',
}, { provider, dependsOn: [service] });
