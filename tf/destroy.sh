#!/bin/bash

# print what will be removed
terraform plan -destroy

# remove provision infra
terraform destroy -auto-approve