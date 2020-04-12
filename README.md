# Zuoyou backend API

## Run during development

`npm run start` to run a development server.

Connect to `http://localhost:9000/`.

## Deployment Pipeline

Just push in the master branch. The CI Gitlab pipeline should deploy the code correctly.

The Gitlab CI pipeline works like this (see `gitlab-ci.yml`) :

1. The Docker image container is built (see `Dockerfile`)
    1. Dependencies are installed (`RUN npm install`)
    2. The JS code is built in the `/dist` folder (`RUN npm run-script build`)
2. The image is pushed to Gitlab container registry
3. In a `google/gcloud-sdk` Docker image, the image is deployed
    1. Authentication to the GCP API using a Gitlab environment variable
    2. Deployment of the `kubernetes.yml` file, which deploys a Kubernetes Replication Controller
4. In Kubernetes, the Replication Controller creates a Pod using the container registered
5. Kubernetes assigns the environment variables defines in the secret of Kubernetes (see `.prod-secrets.yaml` uncommitted file)
