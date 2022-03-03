#!/bin/bash

echo "Extract Database Information"
cd /opt/reactapp/BE/
echo -n "$MYSQL_CREDENTIALS" | base64 -d > /cd /opt/reactapp/BE/mysql_configuration.yml

echo "Starting the java applictaion ..."
cd /opt/reactapp/
# send it to the background and resume with the next instruction
(java -jar target/react-and-spring-data-rest-*.jar) &

echo "Starting Nginx web server ...."
nginx