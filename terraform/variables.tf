variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "instance_type" {
  type    = string
  default = "t3.micro" # free-tier on newer accounts
}

variable "key_name" {
  type        = string
  description = "Existing EC2 key pair name (no .pem suffix)"
}

variable "my_ip" {
  type        = string
  description = "Your public IP as CIDR, e.g. 1.2.3.4/32"
}

variable "repo_url" {
  type        = string
  description = "Public git URL to clone and run with Docker Compose"
}
