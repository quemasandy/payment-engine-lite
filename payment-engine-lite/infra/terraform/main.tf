terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

locals {
  use_aws = var.cloud_provider == "aws"
}

provider "aws" {
  region = var.region
  skip_credentials_validation = true
  skip_requesting_account_id = true
  endpoints {
    sns = "http://localhost:4566"
    sqs = "http://localhost:4566"
    dynamodb = "http://localhost:4566"
  }
  access_key = "test"
  secret_key = "test"
}

module "aws" {
  count = local.use_aws ? 1 : 0
  source = "./modules/aws"
  queue_type = var.queue_type
  region = var.region
}
