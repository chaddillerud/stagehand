# StageHand - Docker Deployment Guide

## Quick Start (GCP VM)

### 1. Install Docker & Docker Compose on your VM

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (logout/login after)
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Upload project files to VM

Download the code from Emergent and upload to your VM via SCP:
```bash
scp -r ./stagehand user@your-vm-ip:~/stagehand
```

### 3. Configure (Optional - for audio transcription)

```bash
cd ~/stagehand
cp .env.example .env
nano .env  # Add your EMERGENT_LLM_KEY
```

### 4. Build and Run

```bash
docker-compose up -d --build
```

### 5. Open Firewall

```bash
# Allow HTTP traffic
sudo ufw allow 80/tcp
# Or via GCP Console: VPC Network > Firewall > Create rule for tcp:80
```

### 6. Access

Open `http://<your-vm-ip>` in your browser.

---

## Useful Commands

```bash
# View logs
docker-compose logs -f

# Stop
docker-compose down

# Restart after code changes
docker-compose up -d --build

# Check status
docker-compose ps
```

## What's Included

- **Frontend**: React app served via Nginx (port 80)
- **Backend**: FastAPI (port 8001 internal)
- **Database**: MongoDB (port 27017 internal)
- **Audio uploads**: Persisted in Docker volume

## Data Backup

```bash
# Backup MongoDB
docker-compose exec mongodb mongodump --db stagehand --archive > backup.archive

# Restore
docker-compose exec -T mongodb mongorestore --archive < backup.archive
```
