# 🚀 X-ray Panto - Distributed X-ray Signal Processing System

A distributed microservices architecture for processing and managing X-ray signals using NestJS, RabbitMQ, and MongoDB.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Assumptions](#assumptions)

## 🎯 Overview

X-ray Panto is a distributed system designed to handle X-ray signal processing with the following capabilities:

- **Producer Service**: Generates and sends X-ray signal data to message queues
- **X-ray Service**: Consumes signals, processes them, and stores in MongoDB
- **Message Queue**: RabbitMQ-based reliable message delivery
- **Data Persistence**: MongoDB for signal storage and retrieval
- **RESTful APIs**: Full CRUD operations for signal management


```

### Services

- **Producer Service**: Handles X-ray signal generation and queue publishing
- **X-ray Service**: Processes incoming signals and manages data persistence
- **RabbitMQ**: Message broker for reliable inter-service communication
- **MongoDB**: Document database for signal storage

## 📋 Prerequisites

Before running this project, ensure you have the following installed:

- **Docker** (version 20.10+)
- **Docker Compose** (version 2.0+)
- **Node.js** (version 18+)
- **npm** or **yarn**

### System Requirements

- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: At least 2GB free space
- **OS**: Windows 10/11, macOS 10.15+, or Linux (Ubuntu 18.04+)

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd xray-panto
   ```

2. **Start all services**
   ```bash
   docker-compose up -d
   ```

3. **Verify services are running**
   ```bash
   docker-compose ps
   ```

4. **Test the system**
   ```bash
   # Test producer health
   curl http://localhost:3001/api/producer/health
   
   # Test x-ray service
   curl http://localhost:3009/api/signals
   ```

## 🔧 Detailed Setup

### 1. Environment Configuration

The project uses Docker Compose for environment management. Key configuration files:

- `docker-compose.yml` - Service orchestration
- `apps/*/Dockerfile` - Service container definitions
- `libs/common/` - Shared libraries and configurations

### 2. Service Ports

| Service | Port | Description |
|---------|------|-------------|
| Producer Service | 3001 | API endpoints for signal generation |
| X-ray Service | 3009 | Signal processing and management API |
| RabbitMQ | 5672 | AMQP protocol port |
| RabbitMQ Management | 15672 | Web management interface |
| MongoDB | 27018 | Database access |

### 3. Database Setup

MongoDB is automatically initialized with:
- **Database**: `xray_panto`
- **Collections**: `signals`
- **Indexes**: Automatic on `deviceId` and `time` fields

### 4. Message Queue Setup

RabbitMQ is configured with:
- **Queue**: `xray_queue` (durable, persistent)
- **Exchange**: Default direct exchange
- **Credentials**: `admin/admin`

## 📚 API Documentation

### Producer Service API

#### Health Check
```http
GET /api/producer/health
Response: {"status":"ok","ts":"2025-08-17T16:12:34.116Z"}
```

#### Send Single Signal
```http
POST /api/producer/send
Content-Type: application/json

{
  "deviceId": "device-001",
  "kV": 120,
  "mA": 250,
  "projectionType": "Lateral"
}
```

#### Send Batch Signals
```http
POST /api/producer/send/{deviceId}/batch?count=5
```

#### Preview Signal
```http
GET /api/producer/preview/{deviceId}
```

### X-ray Service API

#### Get All Signals
```http
GET /api/signals
Query Parameters:
  - page: number (default: 1)
  - limit: number (default: 10)
  - sortBy: string (default: "time")
  - sortOrder: "asc" | "desc" (default: "desc")
```

#### Get Signal by ID
```http
GET /api/signals/{id}
```

#### Create Signal
```http
POST /api/signals
Content-Type: application/json

{
  "deviceId": "device-001",
  "kV": 120,
  "mA": 250,
  "projectionType": "Lateral",
  "exposureTime": 150
}
```

#### Update Signal
```http
PATCH /api/signals/{id}
Content-Type: application/json

{
  "kV": 130,
  "mA": 300
}
```

#### Delete Signal
```http
DELETE /api/signals/{id}
```

#### Filter Signals
```http
GET /api/signals/filter
Query Parameters:
  - deviceId: string
  - projectionType: string
  - minKV: number
  - maxKV: number
  - minMA: number
  - maxMA: number
  - startDate: ISO date string
  - endDate: ISO date string
```

## 🛠️ Development

### Project Structure

```
xray-panto/
├── apps/
│   ├── producer-service/     # Signal generation service
│   │   ├── src/
│   │   │   ├── dto/         # Data transfer objects
│   │   │   ├── main.ts      # Application entry point
│   │   │   ├── producer.controller.ts
│   │   │   ├── producer.service.ts
│   │   │   └── producer.module.ts
│   │   └── Dockerfile
│   └── xray-service/        # Signal processing service
│       ├── src/
│       │   ├── signals/     # Signal management module
│       │   ├── consumer/    # Message queue consumer
│       │   ├── main.ts      # Application entry point
│       │   └── app.module.ts
│       └── Dockerfile
├── libs/
│   └── common/              # Shared libraries
│       ├── database/        # Database configuration
│       ├── rmq/            # RabbitMQ service
│       ├── swagger/        # API documentation
│       └── utils/          # Utility functions
├── docker-compose.yml       # Service orchestration
└── package.json            # Project dependencies
```

### Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start services in development mode**
   ```bash
   # Start infrastructure services
   docker-compose up -d mongodb rabbitmq
   
   # Start producer service
   cd apps/producer-service
   npm run start:dev
   
   # Start x-ray service (in new terminal)
   cd apps/xray-service
   npm run start:dev
   ```

3. **Code changes**
   - Services will automatically reload on file changes
   - Use `npm run build` to compile TypeScript
   - Use `npm run test` to run unit tests

### Building Services

```bash
# Build all services
npm run build

# Build specific service
npm run build producer-service
npm run build xray-service
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run tests for specific service
npm run test producer-service
npm run test xray-service

# Run e2e tests
npm run test:e2e
```

### Test Coverage

```bash
# Generate coverage report
npm run test:cov
```

## 🚀 Deployment

### Production Deployment

1. **Build production images**
   ```bash
   docker-compose -f docker-compose.prod.yml build
   ```

2. **Deploy with environment variables**
   ```bash
   export NODE_ENV=production
   export MONGODB_URI=mongodb://your-mongodb-uri
   export RABBITMQ_URL=amqp://your-rabbitmq-uri
   
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Service port | `3001` (producer), `3009` (xray) |
| `MONGODB_URI` | MongoDB connection string | `mongodb://mongodb:27017` |
| `RABBITMQ_URL` | RabbitMQ connection string | `amqp://admin:admin@rabbitmq:5672` |

## 🔍 Troubleshooting

### Common Issues

#### Services Not Starting
```bash
# Check service logs
docker-compose logs producer-service
docker-compose logs xray-service

# Check service status
docker-compose ps
```

#### Connection Issues
```bash
# Verify network connectivity
docker network ls
docker network inspect xray-panto_default

# Check service health
curl http://localhost:3001/api/producer/health
curl http://localhost:3009/api/signals
```

#### Database Connection Issues
```bash
# Check MongoDB status
docker-compose logs mongodb

# Verify MongoDB connection
docker exec -it mongodb mongosh --eval "db.adminCommand('ping')"
```

#### Queue Issues
```bash
# Check RabbitMQ status
docker-compose logs rabbitmq

# Access RabbitMQ management
# Open http://localhost:15672 in browser
# Login: admin/admin
```

### Performance Issues

- **High Memory Usage**: Increase Docker memory limits
- **Slow Processing**: Check MongoDB indexes and RabbitMQ queue depth
- **Connection Timeouts**: Verify network configuration and firewall settings

## 🤔 Assumptions

### Technical Assumptions

1. **Message Queue Reliability**
   - RabbitMQ provides at-least-once delivery
   - Messages are persistent and survive service restarts
   - Automatic reconnection with exponential backoff

2. **Data Consistency**
   - MongoDB provides eventual consistency
   - Signal processing is idempotent
   - Duplicate messages are handled gracefully

3. **Network Assumptions**
   - Services communicate over Docker internal network
   - External access through exposed ports
   - Network latency is minimal (< 100ms)

4. **Resource Requirements**
   - Sufficient memory for message buffering
   - Adequate disk space for MongoDB and message persistence
   - CPU resources for concurrent message processing

### Business Assumptions

1. **Signal Processing**
   - X-ray signals are time-sensitive but not real-time critical
   - Processing delays of 3-5 seconds are acceptable
   - Signal data is immutable once processed

2. **Data Volume**
   - Moderate throughput (100-1000 signals per minute)
   - Signal data size is consistent (~2-5KB per signal)
   - Historical data retention is required

3. **Device Management**
   - Device IDs are unique and persistent
   - Device configurations are managed externally
   - Device health monitoring is not included

4. **Error Handling**
   - Failed signals are logged but not retried automatically
   - System continues operating with partial failures
   - Manual intervention required for critical errors


## 📝 License

This project is proprietary and confidential.

## 🤝 Contributing

For internal development team use only.


---

**Last Updated**: August 17, 2025  
**Version**: 1.0.0  
**Status**: Production Ready ✅
