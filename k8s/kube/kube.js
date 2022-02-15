"use strict";

const fs = require("fs");
const path = require("path");
const YAML = require('json2yaml');

const Deployer = {

    exposedDeployment: false,
    /**
     * Generate a list of custom ports to expose
     * @returns {null|*}
     */
    ports: () => {
        let portTemplate = {
            "name": "",
            "protocol": "TCP",
        };

        if (process.env.PORTS) {
            try {
                let portsConfig = JSON.parse(process.env.PORTS);
                let ports = [];
                portsConfig.forEach((onePort) => {
                    let t = JSON.parse(JSON.stringify(portTemplate));
                    t.name = onePort.name;
                    t.internal = onePort.internal;
                    t.external = onePort.external;
                    ports.push(t);

                    //if at least one exposed port is set, then set to true
                    if (process.env.PORT_TYPE === 'LoadBalancer' || onePort.external) {
                        Deployer.exposedDeployment = true;
                    }
                });

                return (ports.length > 0) ? ports : null;
            } catch (e) {
                return null;
            }
        } else return null;
    },
   
    /**
     * Generate a custom deployment template
     * @param customPorts
     * @param cb
     */
    deployment: (customPorts, cb) => {
        /**
         * update the deployment template with the values from env vars
         * @type {*|void|string}
         */
        let deploymentTemplatePath = path.normalize(path.join(__dirname, 'deployment.json'));
        let deployTemplate = require(deploymentTemplatePath);
        let name = process.env.DOCKER_HUB_REPO;
        if(process.env.DEPLOYMENT_NAME_SUFFIX){
            name += `-${process.env.DEPLOYMENT_NAME_SUFFIX}`;
        }
        deployTemplate.metadata.name = `deployment-${name}`;
        deployTemplate.metadata.labels.app = `${name}`;
        deployTemplate.spec.selector.matchLabels.app = `${name}`;
        deployTemplate.spec.template.metadata.labels.app = `${name}`;
        deployTemplate.spec.template.spec.containers[0].name = `pod-${name}`;
        deployTemplate.spec.template.spec.containers[0].image = `${process.env.DOCKER_HUB_USER}/${name}:v${process.env.BITBUCKET_TAG}`;

        if (process.env.DEPLOYMENT_REPLICAS) {
            deployTemplate.spec.replicas = parseInt(process.env.DEPLOYMENT_REPLICAS, 10);
        } else {
            deployTemplate.spec.replicas = 1;
        }

        if (process.env.READINESS_PROBE_PORT) {
            deployTemplate.spec.template.spec.containers[0].readinessProbe.httpGet = {
                port: parseInt(process.env.READINESS_PROBE_PORT, 10)
            };

            if (process.env.READINESS_PROBE_PATH) {
                deployTemplate.spec.template.spec.containers[0].readinessProbe.httpGet.path = process.env.READINESS_PROBE_PATH;
            }
        } else {
            delete deployTemplate.spec.template.spec.containers[0].readinessProbe;
        }

        if (process.env.AUTOSCALE_CPU_LIMIT) {
            let cpuLimit = parseInt(process.env.AUTOSCALE_CPU_LIMIT, 10);
            if(!deployTemplate.spec.template.spec.containers[0].resources){
                deployTemplate.spec.template.spec.containers[0].resources = {};
            }
            if(!deployTemplate.spec.template.spec.containers[0].resources.limits){
                deployTemplate.spec.template.spec.containers[0].resources.limits = {};
            }
            deployTemplate.spec.template.spec.containers[0].resources.limits.cpu = cpuLimit + "m";
        }

        //override the default image pull policy if instructed to
        if (process.env.DOCKER_IMAGE_PULL_POLICY) {
            deployTemplate.spec.template.spec.containers[0].imagePullPolicy = process.env.DOCKER_IMAGE_PULL_POLICY;
        }

        //THE NAME OF THE KUBERNETES SECRET THAT CONTAINS THE CREDENTIALS TO CONNECT TO THE DOCKER PRIVATE HUB
        //THEN PULL THE IMAGE AND DEPLOY FROM IT.
        if (process.env.DOCKER_PRIVATE_REGISTRY) {
            deployTemplate.spec.template.spec.imagePullSecrets = [{name: process.env.DOCKER_PRIVATE_REGISTRY}];
        }

        deployTemplate.spec.template.spec.containers[0].env = [];
        deployTemplate.spec.template.spec.containers[0].env.push({'name': 'APP_ENV', 'value': process.env.APP_ENV || 'prod'});

        //inject custom environment variables to the deployment recipes.
        //only look for env variables whose names are: CUSTOM_ENV_VAR_NAME and inject them
        //while injecting them rename the env variables to ENV_VAR_NAME remove (CUSTOM_)
        for (let i in process.env) {
            if (i.includes('CUSTOM_')) {
                let label = i.replace('CUSTOM_', '');
                deployTemplate.spec.template.spec.containers[0].env.push({'name': label, 'value': process.env[i]});
            } else if (i.includes('SECRET_ENV_')) {
                let label = i.replace('SECRET_ENV_', '');
                let secretEnv = process.env[i].split(":")
                deployTemplate.spec.template.spec.containers[0].env.push({
                    name: label,
                    valueFrom: {
                        secretKeyRef: {
                            name: secretEnv[0],
                            key: secretEnv[1]
                        }
                    }
                });
            }
        }
        deployTemplate.spec.template.spec.containers[0].env.push({
            name: 'COMMIT',
            value: process.env.BITBUCKET_COMMIT
        });

        //attach the main command
        deployTemplate.spec.template.spec.containers[0].args.push(process.env.STARTUP_CMD);


        if (customPorts) {
            deployTemplate.spec.template.spec.containers[0].ports = [];
            customPorts.forEach((onePort) => {
                deployTemplate.spec.template.spec.containers[0].ports.push({"containerPort": onePort.internal});
            });
        }

        let deploymentTemplateOutputPath = path.normalize(path.join(__dirname, '../../', 'deployment.yml'));
        fs.writeFile(deploymentTemplateOutputPath, YAML.stringify(deployTemplate), cb);
    },

    /**
     * Generate a custom service template
     * @param customPorts
     * @param cb
     */
    service: (customPorts, cb) => {
        /**
         * update the service template with the values from env vars
         * @type {*|void|string}
         */
        let serviceTemplatePath = path.normalize(path.join(__dirname, 'service.json'));
        let serviceTemplate = require(serviceTemplatePath);
        let name = process.env.DOCKER_HUB_REPO;
        if(process.env.DEPLOYMENT_NAME_SUFFIX){
            name += `-${process.env.DEPLOYMENT_NAME_SUFFIX}`;
        }
        serviceTemplate.metadata.name = `service-${name}`;
        serviceTemplate.metadata.labels.app = `${name}`;
        serviceTemplate.spec.selector.app = `${name}`;

        //override the default port type exposure method
        if (process.env.PORT_TYPE) {
            serviceTemplate.spec.type = process.env.PORT_TYPE;
        }

        let prefix = 'external';
        //attach the custom exposed ports for this service
        if (customPorts) {
            serviceTemplate.spec.ports = [];
            customPorts.forEach((onePort) => {
                //only attach an exposed port
                if (onePort.external) {
                    let onePortConfig = {
                        name: onePort.name,
                        port: onePort.external,
                        targetPort: onePort.internal,
                        "protocol": "TCP"
                    };

                    if (!process.env.DYNAMIC_EXTERNAL_PORTS && serviceTemplate.spec.type === 'NodePort') {
                        onePortConfig.nodePort = 30000 + parseInt(onePort.external, 10);
                        if (onePortConfig.nodePort > 32767) {
                            onePortConfig.nodePort = 30000 + Math.ceil(Math.random() * 2767);
                        }
                    }
                    serviceTemplate.spec.ports.push(onePortConfig);
                }
            });
            serviceTemplate.metadata.name = `service-${name}-external`;
        } else {
            prefix = 'internal';
            delete serviceTemplate.spec.type;
            serviceTemplate.spec.ports = [
                {
                    name: "main",
                    port: 80,
                    targetPort: 80,
                    protocol: "TCP"
                }
            ];
            serviceTemplate.metadata.name = `service-${name}-internal`;
        }

        let serviceTemplateOutputPath = path.normalize(path.join(__dirname, '../../', `${prefix}-service.yml`));
        fs.writeFile(serviceTemplateOutputPath, YAML.stringify(serviceTemplate), cb);
    }

};

const customPorts = Deployer.ports();
Deployer.deployment(customPorts, (error) => {
    if (error) {
        throw error;
        process.exit(-1);
    }
    console.log("Generated Kubernetes Deployment Recipe ...");

    //the deployment is instructing to be exposed
    if (Deployer.exposedDeployment) {
        Deployer.service(customPorts, (error) => {
            if (error) {
                throw error;
                process.exit(-1);
            }
            console.log("Generated Kubernetes Service Recipe and attached it to Deployment Recipe...");
        });
    } else {
        console.log("did not detect any exposed ports, no service file will be created.")
    }
});