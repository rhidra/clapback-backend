# Zuoyou backend API

## Run during development

To run a development server with a database :

```shell script
# Start the mongo DB daemon
mongod

# Start the node server and watches for changes in the code files
npm run dev
```

Connect to `http://localhost:9000/`.

## Deployment Pipeline

Just push in the master branch. The CI Gitlab pipeline should deploy the code correctly.

The Gitlab CI pipeline works like this (see `gitlab-ci.yml`) :

1. The Docker image container is built (see `Dockerfile`)
    1. Dependencies are installed (`RUN npm install`)
    2. The JS code is built in the `/dist` folder (`RUN npm run build`)
2. The image is pushed to Gitlab container registry
3. In a `google/gcloud-sdk` Docker image, the image is deployed
    1. Authentication to the GCP API using a Gitlab environment variable
    2. Deployment of the `kubernetes.yml` file, which deploys a Kubernetes Replication Controller
4. In Kubernetes, the Replication Controller creates a Pod using the container registered
5. Kubernetes assigns the environment variables defines in the secret of Kubernetes (see `.prod-secrets.yaml` uncommitted file)
6. A service is created, allowing the pod to connect to the Ingress
7. An Ingress is created, to regulate the incoming traffic, connect to the static IP address set up in GCP, 
and manage the HTTPS certificate

The Mongo database is created by the `mongo.yaml` file. It needs first a Storage class, called `fast`.
The yaml file creates a persistent volume claim (PVC) and a deployment with a pod template using the MongoDB
image. The PVC is mounted in `/data/db` of the pod to store the data of the DB. 
To init the DB, you only need to run this command once :

```shell script
kubectl apply -f mongo.yaml
```
