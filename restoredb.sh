# Use mongorestore to restore a backup of the mongo DB stored in ./dump
docker cp ./dump $(docker-compose ps -q mongo):/
docker exec $(docker-compose ps -q mongo) mongorestore
