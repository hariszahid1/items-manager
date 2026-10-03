output "public_ip" {
  value = aws_instance.backend.public_ip
}

output "ssh_command" {
  value = "ssh -i ~/Downloads/aws-ssh.pem ubuntu@${aws_instance.backend.public_ip}"
}

output "app_url" {
  value = "http://${aws_instance.backend.public_ip}/"
}

output "health_url" {
  value = "http://${aws_instance.backend.public_ip}/api/health"
}
