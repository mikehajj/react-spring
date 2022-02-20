FROM mikehajj/faster-ubuntu
MAINTAINER Mike Hajj <mike.hajj@gmail.com>

RUN echo "Updating the list of repositories ..."
RUN apt-get update

RUN echo "Installing Nginx ..."
RUN apt-get install -y nginx

RUN echo "Copying Repository Content ..."
RUN mkdir /opt/reactapp/
ADD . /opt/reactapp/

RUN echo "Building Application ..."
RUN cd /opt/reactapp/ && ./mvnw clean verify

RUN echo "Copying Nginx Configuration files ..."
RUN cp -f /opt/reactapp/k8s/BE/spring.conf  /etc/nginx/sites-enabled/spring.conf

RUN echo "Setting Startup Script ..."
RUN chmod +x /opt/reactapp/k8s/BE/script/start.sh
CMD ["/bin/bash", "/opt/reactapp/k8s/BE/script/start.sh"]

