# Clapback backend API

## Installation of dependancies

Install nvm (which installs npm and nodejs) and
[mongo](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/).

Install node modules. You also need to create the mongo storage folder.

```shell script
npm install
mkdir -p data-node/db
```

Maybe you will need to increase the number of [file watchers](https://github.com/guard/listen/wiki/Increasing-the-amount-of-inotify-watchers#the-technical-details), with:

```shell script
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p
```

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

## SSH to the server

To ssh to the server, use the RSA keys. The root user is `root` and the regular user is `api`. 
The backend repository is located in `/home/api/clapback-backend`.