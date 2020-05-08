# Use mongodump to do a backup of the mongo DB in ./dump
docker exec $(docker-compose ps -q mongo) mongodump
docker cp $(docker-compose ps -q mongo):/dump ./
