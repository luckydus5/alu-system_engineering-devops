# Load Balancer

This project configures a load-balanced web infrastructure using Nginx and HAproxy.

## Files

| File | Description |
|------|-------------|
| `0-custom_http_response_header` | Bash script that configures Nginx to add a custom `X-Served-By` HTTP response header with the server's hostname |
| `1-install_load_balancer` | Bash script that installs and configures HAproxy to distribute traffic to web-01 and web-02 using roundrobin |

## Servers

| Name | IP |
|------|-----|
| 6979-web-01 | 13.218.57.12 |
| 6979-web-02 | 44.202.228.82 |
| 6979-lb-01 | Load balancer |
# Step 1: Copy script to web-01 and run it
scp -i "C:\Users\Olivier\.ssh\Intranet ssh\sshintra" "D:\Projets\Class  -ALU\alu-system_engineering-devops\load_balancer\0-custom_http_response_header" ubuntu@13.218.57.12:~/
ssh -i "C:\Users\Olivier\.ssh\Intranet ssh\sshintra" ubuntu@13.218.57.12 "sudo bash ~/0-custom_http_response_header"

# Step 2: Copy script to web-02 and run it
scp -i "C:\Users\Olivier\.ssh\Intranet ssh\sshintra" "D:\Projets\Class  -ALU\alu-system_engineering-devops\load_balancer\0-custom_http_response_header" ubuntu@44.202.228.82:~/
ssh -i "C:\Users\Olivier\.ssh\Intranet ssh\sshintra" ubuntu@44.202.228.82 "sudo bash ~/0-custom_http_response_header"

# Step 3: Verify both servers return X-Served-By
curl -sI 13.218.57.12 | findstr X-Served-By
curl -sI 44.202.228.82 | findstr X-Served-By