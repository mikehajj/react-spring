FROM mikehajj/faster-ubuntu
MAINTAINER Mike Hajj <mike.hajj@gmail.com>

RUN echo "Updating the list of repositories ..."
RUN apt-get update

RUN echo "Installing Nginx ..."
RUN apt-get install -y nginx

RUN echo "Installing NPM ..."
RUN apt-get install -y npm

RUN echo "Copying Repository Content ..."
RUN mkdir /opt/reactapp/
ADD . /opt/reactapp/

RUN echo "Installing NPM Modules ..."
RUN cd /opt/reactapp && npm install

RUN echo "Building application ..."
RUN cd /opt/reactapp && npm run watch

RUN echo "Copying Nginx Configuration files ..."
RUN cp -f /opt/reactapp/k8s/FE/nginx/react.conf  /etc/nginx/sites-enabled/react.conf

RUN echo "Setting Startup Script ..."
RUN chmod +x /opt/reactapp/k8s/FE/script/start.sh
CMD ["/bin/bash", "/opt/reactapp/k8s/FE/script/start.sh"]

