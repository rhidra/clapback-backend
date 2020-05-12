# Zuoyou backend API

## Run during development

To run a development server with a database :

```shell script
npm run dev
```

This starts a mongod instance on the `27017` port. For more info, look at `package.json`.

Connect to `http://localhost:9000/`.

## Deployment Pipeline

Just push in the master branch. The CI Gitlab pipeline should deploy the code correctly.

The Gitlab CI pipeline is configured in `gitlab-ci.yml`. It first connect in SSH to the server, using the RSA key given
in Gitlab environment variable configuration. Then, it pulls the last version of the code, build the containers, then
up the docker-compose file.
