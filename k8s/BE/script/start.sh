#!/bin/bash

echo "Starting the java applictaion ..."
# send it to the background and resume with the next instruction
(java -jar target/react-and-spring-data-rest-*.jar) &

echo "Starting Nginx web server ...."
nginx