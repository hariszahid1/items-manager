# Terraform — AWS EC2 + auto-deploy (Week 4 Day 1)

Creates an Ubuntu 22.04 EC2 instance, installs Docker on first boot, clones this repo, and starts Docker Compose.

Run these commands on **your laptop**, not on the EC2 box. `aws configure` uses IAM keys; the server does not need the AWS CLI.

## Files

| File | Role |
|------|------|
| `main.tf` | Provider, Ubuntu AMI lookup, security group, EC2 |
| `variables.tf` | Knobs (`key_name`, `my_ip`, `repo_url`) |
| `outputs.tf` | Public IP, SSH command, app URL |
| `user_data.sh` | First-boot script (swap, Docker, clone, compose) |
| `terraform.tfvars.example` | Copy to `terraform.tfvars` (gitignored) |

Do not commit `terraform.tfstate`, `terraform.tfvars`, or `*.pem`.

## Steps

```bash
# 1. Tools on your laptop
#    terraform version
#    aws --version
aws configure
aws sts get-caller-identity

# 2. Values
cp terraform.tfvars.example terraform.tfvars
aws ec2 describe-key-pairs --query "KeyPairs[].KeyName" --output table
curl ifconfig.me   # put that IP as  x.x.x.x/32  in terraform.tfvars

# 3. Plan and apply
terraform init
terraform plan
terraform apply

# 4. SSH (private key file, not an AMI path)
ssh -i ~/Downloads/aws-ssh.pem ubuntu@$(terraform output -raw public_ip)

# Watch first-boot setup (~3 minutes)
sudo tail -f /var/log/cloud-init-output.log

# 5. App
#    http://<public_ip>/
#    http://<public_ip>/api/health

# 6. Tear down when done so it stops billing
terraform destroy
```

Force a fresh first boot after editing `user_data.sh`:

```bash
terraform apply -replace="aws_instance.backend"
```

## Command reference

| Command | What it does |
|---------|----------------|
| `terraform init` | Download providers. Run once. |
| `terraform plan` | Dry run. Builds nothing. |
| `terraform apply` | Create or update. Type `yes`. |
| `terraform apply -replace=ADDR` | Recreate one resource (fresh `user_data`). |
| `terraform destroy` | Delete everything Terraform created. |
| `terraform fmt` / `terraform validate` | Format / syntax check. |
| `terraform output` | Print IP and SSH command. |
| `aws sts get-caller-identity` | Confirm IAM user. |
| `sudo docker ps` | Containers on the server. |
| `sudo tail -f /var/log/cloud-init-output.log` | Watch first-boot script. |

This app is not the classroom `/products` sample. After boot, open `/` and `/api/health`.

## Scan Terraform (tfsec)

```bash
docker run --rm -v "${PWD}:/src" aquasec/tfsec /src
```

GitHub Actions job: `.github/workflows/terraform-scan.yml` (`continue-on-error: true` until you want it to block merges).
