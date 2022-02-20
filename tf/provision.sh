#!/bin/bash

# initialize terraform
terraform init

# preview what is about to be created
terraform plan -var-file="terraform.tfvars" --out mike_linode_k8s

# provision the k8s
terraform apply --auto-approve -var-file="terraform.tfvars"


# export the k8s config file
export KUBE_VAR=$(terraform output kubeconfig)
KUBE_VAR=$(sed 's/"//g' <<<$KUBE_VAR)
echo $KUBE_VAR | base64 -d > kubeconfig.yml

# copy the terraform state to the root of the repository
cp terraform.tfstate ../terraform.tfstate

# copy the kubeconfig file to the root of the repository
cp kubeconfig.yml ../kubeconfig.yml