Clapback backend API
====================

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

## Setup in production

First, to secure the server, you need to [setup the SSH keys](https://www.digitalocean.com/community/tutorial_collections/how-to-set-up-ssh-keys).
Then configure [the firewall UFW](https://www.digitalocean.com/community/tutorials/how-to-set-up-a-firewall-with-ufw-on-ubuntu-20-04).
Install [docker](https://docs.docker.com/engine/install/ubuntu/) and [docker compose](https://docs.docker.com/compose/install/).

Setup the DNS server correctly, and update the domain name in `init-letsencrypt.sh`.
The DNS configuration needs to be done, which can take up to 48h, before you can go to the next step.

Initialize the Let's Encrypt configuration. 
In case this does not work, you can re-run the command.
Maybe remove the `certbot/` directory, just to be sure.
This comes from [this tutorial](https://medium.com/@pentacent/nginx-and-lets-encrypt-with-docker-in-less-than-5-minutes-b4b8a60d3a71).
```shell script
sudo ./init-letsencrypt.sh
```

Update the `.env` file.
```shell script
cp sample.env .env
```

You should be able to start the server:
```shell script
docker-compose up
```

## Deployment Pipeline

To setup the deployement pipeline, generate a set of RSA keys with `ssh-keygen`.
Go on Gitlab to `repo -> Settings -> CI -> Environment Var`. Set the environment
variable `SSH_DEPLOY_KEY` to the private key generated (e.g: `./id_rsa`).
Then SSH to the server, go to the `~/.ssh/authorized_keys` file.
Add a line with the exact public key (e.g: `./id_rsa.pub`).
The configuration for the continuous integration is done !

You can just push in the master branch. The CI Gitlab pipeline should deploy the code correctly.

The Gitlab CI pipeline is configured in `gitlab-ci.yml`. It first connect in SSH to the server, using the RSA key given
in Gitlab environment variable configuration. Then, it pulls the last version of the code, build the containers, then
up the docker-compose file.

## SSH to the server

To ssh to the server, use the RSA keys. The root user is `root` and the regular user is `api`. 
The backend repository is located in `/home/api/clapback-backend`.