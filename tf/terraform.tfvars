label = "mike-lke-cluster"
k8s_version = "1.22"
region = "us-east"
pools = [
  {
    count : 3
    type : "g6-standard-2"
  }
]
token = "mike"