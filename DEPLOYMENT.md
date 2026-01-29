# StageHand - Docker Deployment Guide

## Prerequisites

- Docker and Docker Compose installed on your GCP VM
- Git (to clone the repo)

## Quick Start

### 1. Clone/Upload the project to your VM

```bash
# If using git
git clone <your-repo-url>
cd stagehand

# Or upload the files via SCP/SFTP
```

### 2. Configure Environment (Optional)

If you want audio transcription to work, edit `docker-compose.yml` and uncomment the OpenAI key:

```yaml
backend:
  environment:
    - OPENAI_API_KEY=your-key-here
```

### 3. Build and Run

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### 4. Access the App

Open your browser and go to:
```
http://<your-vm-ip>
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     GCP VM                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   Nginx     │  │   FastAPI   │  │    MongoDB      │  │
│  │  (Frontend) │──│  (Backend)  │──│   (Database)    │  │
│  │   :80       │  │   :8001     │  │   :27017        │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
         │
         ▼
    Users access :80
```

## Useful Commands

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v

# Rebuild a specific service
docker-compose up -d --build backend

# View logs for a specific service
docker-compose logs -f backend

# Access MongoDB shell
docker-compose exec mongodb mongosh stagehand

# Backup MongoDB data
docker-compose exec mongodb mongodump --db stagehand --out /backup
docker cp stagehand-mongodb:/backup ./backup

# Restore MongoDB data
docker cp ./backup stagehand-mongodb:/backup
docker-compose exec mongodb mongorestore --db stagehand /backup/stagehand
```

## Firewall Configuration

Make sure port 80 is open on your GCP VM:

```bash
# GCP Console or gcloud CLI
gcloud compute firewall-rules create allow-http \
    --allow tcp:80 \
    --source-ranges 0.0.0.0/0 \
    --description "Allow HTTP traffic"
```

## SSL/HTTPS (Optional)

For production, you should add SSL. The easiest way is to:

1. Use a reverse proxy like Traefik or Caddy
2. Or add Let's Encrypt certificates to nginx

Example with Caddy (replace nginx in docker-compose):

```yaml
caddy:
  image: caddy:2
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./Caddyfile:/etc/caddy/Caddyfile
    - caddy_data:/data
```

## Troubleshooting

### Container won't start
```bash
docker-compose logs <service-name>
```

### MongoDB connection issues
```bash
# Check if MongoDB is healthy
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
```

### Frontend can't reach backend
- Check that `backend` service is running
- Verify nginx.conf proxy settings
- Check backend logs for errors

## Data Persistence

- **MongoDB data**: Stored in `mongodb_data` Docker volume
- **Audio files**: Stored in `audio_uploads` Docker volume

To back up volumes:
```bash
docker run --rm -v stagehand_mongodb_data:/data -v $(pwd):/backup alpine tar czf /backup/mongodb_backup.tar.gz /data
docker run --rm -v stagehand_audio_uploads:/data -v $(pwd):/backup alpine tar czf /backup/audio_backup.tar.gz /data
```
