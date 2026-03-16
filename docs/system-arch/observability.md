# Observability Implementation

This document explains how and why observability is implemented in the World Monitor application.

## Overview

Observability refers to the ability to understand the internal state of a system by examining its outputs. In our FastAPI application, we implement observability through metrics collection using Prometheus.

## Why Observability?

1. **Performance Monitoring**: Track request latencies and identify slow endpoints
2. **Error Detection**: Monitor HTTP status codes to catch errors early
3. **Capacity Planning**: Understand traffic patterns for resource allocation
4. **SLA Compliance**: Measure and report on service level agreements
5. **Debugging**: Correlate metrics with logs to diagnose issues

## Implementation Details

### Packages Used

| Package | Purpose |
|---------|---------|
| `prometheus-client` | Python client library for Prometheus metrics |
| `starlette-exporter` | Starlette/FastAPI integration for Prometheus |
| `fastapi-health` | Health check endpoints for the application |

### Metrics Collected

#### 1. Request Counter (`http_requests_total`)

A Counter metric that tracks the total number of HTTP requests.

**Labels:**
- `method`: HTTP method (GET, POST, PUT, DELETE, etc.)
- `endpoint`: The request path
- `status_code`: HTTP response status code

**Use Cases:**
- Calculate request rate: `rate(http_requests_total[5m])`
- Track error rate: `sum(rate(http_requests_total{status_code=~"5.."}[5m]))`
- Compare traffic across endpoints

#### 2. Request Latency Histogram (`http_request_duration_seconds`)

A Histogram metric that tracks HTTP request latency distribution.

**Labels:**
- `method`: HTTP method
- `endpoint`: The request path

**Buckets:** `[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]` seconds

**Use Cases:**
- Calculate average latency: `rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])`
- Calculate percentiles: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`
- Identify performance regressions

### Architecture

```mermaid
flowchart TD
    DEV(["Developer / Ops"])

    subgraph VIZ["Visualization Layer"]
        GRAFANA["Grafana<br/><i>:3000 &mdash; Dashboards · Alerts</i>"]
    end

    subgraph AGG["Aggregation Layer"]
        PROM["Prometheus<br/><i>:9090 &mdash; Scrape · Store · Alert</i>"]
    end

    subgraph COL["Collection Layer"]
        FASTAPI["FastAPI App<br/><i>:8000 · /internal/x7k9m2p4q1w8e5r3</i><br/><i>http_requests_total · http_request_duration_seconds</i>"]
        NODE["Node Exporter<br/><i>:9100 · node_cpu_seconds_total · node_memory_* · node_filesystem_*</i>"]
        PGEXP["Postgres Exporter<br/><i>:9187 · pg_stat_activity_count · pg_database_size_bytes</i>"]
    end

    subgraph INFRA["Infrastructure Layer"]
        APP["World Monitor API"]
        HOST["Host System<br/><i>CPU · RAM · Disk · Net</i>"]
        PG["PostgreSQL<br/><i>:5432</i>"]
    end

    DEV -->|"HTTP :3000"| GRAFANA
    GRAFANA -->|"PromQL over HTTP"| PROM
    PROM -->|"GET /metrics every 15s"| FASTAPI
    PROM -->|"GET /metrics every 15s"| NODE
    PROM -->|"GET /metrics every 15s"| PGEXP
    FASTAPI -->|"reads / writes"| APP
    NODE -->|"reads"| HOST
    PGEXP -->|"pg_stat queries"| PG
    APP -->|"uses"| PG

    style DEV fill:#1b9aaa,stroke:#1b9aaa,color:#0d1b2a
    style VIZ fill:#0d1b2a,stroke:#F46800,stroke-width:2px,color:#e0e0e0
    style AGG fill:#0d1b2a,stroke:#E6522C,stroke-width:2px,color:#e0e0e0
    style COL fill:#0d1b2a,stroke:#1b9aaa,stroke-width:2px,color:#e0e0e0
    style INFRA fill:#1b263b,stroke:#778da9,stroke-width:1px,color:#e0e0e0
    style GRAFANA fill:#1a1a2e,stroke:#F46800,color:#e0e0e0
    style PROM fill:#1a1a2e,stroke:#E6522C,color:#e0e0e0
    style FASTAPI fill:#16213e,stroke:#e77f67,color:#e0e0e0
    style NODE fill:#16213e,stroke:#00d4aa,color:#e0e0e0
    style PGEXP fill:#16213e,stroke:#f8b739,color:#e0e0e0
    style APP fill:#16213e,stroke:#e77f67,color:#e0e0e0
    style HOST fill:#2d3436,stroke:#dfe6e9,color:#e0e0e0
    style PG fill:#1a1a2e,stroke:#f8b739,color:#e0e0e0
```

### Monitoring Stack Components

#### 1. Prometheus (Time-Series Database)

Prometheus is the core of our monitoring stack. It scrapes metrics from all configured targets and stores them as time-series data.

**Default Port:** `9090`

**Key Features:**
- Pull-based metrics collection
- Powerful PromQL query language
- Built-in alerting with Alertmanager integration
- Service discovery support

#### 2. Grafana (Visualization)

Grafana provides rich visualization dashboards for all collected metrics.

**Default Port:** `3000`

**Key Features:**
- Pre-built dashboards for common exporters
- Custom dashboard creation
- Alerting with multiple notification channels
- User/team management

#### 3. Node Exporter (System Metrics)

Node Exporter collects hardware and OS-level metrics from the host system.

**Default Port:** `9100`

**Metrics Collected:**
| Metric | Description |
|--------|-------------|
| `node_cpu_seconds_total` | CPU time spent in different modes |
| `node_memory_MemTotal_bytes` | Total memory in bytes |
| `node_memory_MemAvailable_bytes` | Available memory |
| `node_filesystem_size_bytes` | Filesystem size |
| `node_filesystem_avail_bytes` | Available filesystem space |
| `node_disk_read_bytes_total` | Disk read bytes |
| `node_disk_written_bytes_total` | Disk write bytes |
| `node_network_receive_bytes_total` | Network bytes received |
| `node_network_transmit_bytes_total` | Network bytes transmitted |
| `node_load1`, `node_load5`, `node_load15` | System load averages |

#### 4. PostgreSQL Exporter (Database Metrics)

PostgreSQL Exporter collects database-specific metrics from PostgreSQL.

**Default Port:** `9187`

**Metrics Collected:**
| Metric | Description |
|--------|-------------|
| `pg_stat_activity_count` | Number of connections per state |
| `pg_stat_database_tup_fetched` | Rows fetched from database |
| `pg_stat_database_tup_inserted` | Rows inserted |
| `pg_stat_database_tup_updated` | Rows updated |
| `pg_stat_database_tup_deleted` | Rows deleted |
| `pg_stat_bgwriter_checkpoints_timed_total` | Scheduled checkpoints |
| `pg_stat_user_tables_seq_scan` | Sequential scans per table |
| `pg_stat_user_tables_idx_scan` | Index scans per table |
| `pg_locks_count` | Number of locks by mode |
| `pg_database_size_bytes` | Database size in bytes |
| `pg_stat_replication_lag` | Replication lag (if applicable) |

### FastAPI Application Middleware

```mermaid
flowchart TD
    REQ(["Incoming HTTP Request"])
    CORS["CORSMiddleware"]
    PROM_MW["PrometheusMetricsMiddleware<br/><i>Records http_requests_total</i><br/><i>Records http_request_duration_seconds</i>"]
    LOG_MW["RequestLoggingMiddleware<br/><i>Assigns X-Request-ID</i><br/><i>Logs method · path · status · duration_ms</i>"]
    ROUTE["Route Handler"]
    RES(["HTTP Response"])

    REQ --> CORS --> PROM_MW --> LOG_MW --> ROUTE --> RES

    style REQ fill:#1b9aaa,stroke:#1b9aaa,color:#0d1b2a
    style CORS fill:#16213e,stroke:#778da9,color:#e0e0e0
    style PROM_MW fill:#16213e,stroke:#E6522C,color:#e0e0e0
    style LOG_MW fill:#16213e,stroke:#00d4aa,color:#e0e0e0
    style ROUTE fill:#16213e,stroke:#e77f67,color:#e0e0e0
    style RES fill:#1b9aaa,stroke:#1b9aaa,color:#0d1b2a
```

### Security Considerations

1. **Obfuscated Endpoint**: The metrics endpoint uses an unpredictable path (`/internal/x7k9m2p4q1w8e5r3`) to prevent unauthorized access through URL guessing.

2. **Internal Prefix**: The `/internal/` prefix clearly indicates this is not a public API endpoint.

3. **No Authentication**: Currently, the endpoint relies on obscurity. For production, consider adding:
   - IP whitelisting (only allow Prometheus server)
   - Basic authentication
   - API key validation

### Configuration

The metrics middleware is added in `config/middleware.py`:

```python
from prometheus_client import Counter, Histogram

REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total number of HTTP requests",
    ["method", "endpoint", "status_code"],
)

REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
)
```

### Usage

#### Accessing Metrics

```bash
curl http://localhost:8000/internal/x7k9m2p4q1w8e5r3
```

#### Prometheus Scrape Configuration

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # FastAPI Application Metrics
  - job_name: 'world-monitor-api'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/internal/x7k9m2p4q1w8e5r3'

  # Node Exporter - System Metrics
  - job_name: 'node-exporter'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:9100']

  # PostgreSQL Exporter - Database Metrics
  - job_name: 'postgres-exporter'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:9187']
```

### Exporter Setup

#### Node Exporter Installation

**Linux (systemd):**
```bash
# Download and install
wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
tar xvfz node_exporter-1.7.0.linux-amd64.tar.gz
sudo mv node_exporter-1.7.0.linux-amd64/node_exporter /usr/local/bin/

# Create systemd service
sudo cat > /etc/systemd/system/node_exporter.service << EOF
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=node_exporter
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable node_exporter
sudo systemctl start node_exporter
```

**Docker:**
```bash
docker run -d \
  --name node-exporter \
  --net="host" \
  --pid="host" \
  -v "/:/host:ro,rslave" \
  quay.io/prometheus/node-exporter:latest \
  --path.rootfs=/host
```

#### PostgreSQL Exporter Installation

**Environment Variables:**
```bash
export DATA_SOURCE_NAME="postgresql://user:password@localhost:5432/worldmonitor?sslmode=disable"
```

**Docker:**
```bash
docker run -d \
  --name postgres-exporter \
  -p 9187:9187 \
  -e DATA_SOURCE_NAME="postgresql://user:password@localhost:5432/worldmonitor?sslmode=disable" \
  quay.io/prometheuscommunity/postgres-exporter:latest
```

**Docker Compose (Full Stack):**
```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.enable-lifecycle'

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false

  node-exporter:
    image: quay.io/prometheus/node-exporter:latest
    container_name: node-exporter
    ports:
      - "9100:9100"
    pid: host
    volumes:
      - /:/host:ro,rslave
    command:
      - '--path.rootfs=/host'

  postgres-exporter:
    image: quay.io/prometheuscommunity/postgres-exporter:latest
    container_name: postgres-exporter
    ports:
      - "9187:9187"
    environment:
      - DATA_SOURCE_NAME=postgresql://user:password@postgres:5432/worldmonitor?sslmode=disable

volumes:
  prometheus_data:
  grafana_data:
```

### Grafana Dashboard Setup

#### Recommended Dashboards

| Dashboard | ID | Description |
|-----------|-----|-------------|
| Node Exporter Full | 1860 | Comprehensive system metrics |
| PostgreSQL Database | 9628 | PostgreSQL overview |
| FastAPI Metrics | Custom | Application-specific metrics |

#### Importing Dashboards

1. Open Grafana at `http://localhost:3000`
2. Go to **Dashboards > Import**
3. Enter the Dashboard ID (e.g., `1860` for Node Exporter)
4. Select Prometheus as the data source
5. Click **Import**

### Useful PromQL Queries

#### Application Metrics
```promql
# Request rate per endpoint
rate(http_requests_total[5m])

# Error rate (5xx responses)
sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100

# 95th percentile latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Average response time
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])
```

#### System Metrics (Node Exporter)
```promql
# CPU usage percentage
100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage percentage
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# Disk usage percentage
(1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100

# Network traffic (bytes/sec)
rate(node_network_receive_bytes_total[5m])
rate(node_network_transmit_bytes_total[5m])
```

#### Database Metrics (PostgreSQL Exporter)
```promql
# Active connections
pg_stat_activity_count{state="active"}

# Connection utilization
pg_stat_activity_count / pg_settings_max_connections * 100

# Transactions per second
rate(pg_stat_database_xact_commit[5m]) + rate(pg_stat_database_xact_rollback[5m])

# Cache hit ratio
pg_stat_database_blks_hit / (pg_stat_database_blks_hit + pg_stat_database_blks_read) * 100

# Database size
pg_database_size_bytes

# Rows inserted/updated/deleted per second
rate(pg_stat_database_tup_inserted[5m])
rate(pg_stat_database_tup_updated[5m])
rate(pg_stat_database_tup_deleted[5m])
```

### Future Improvements

1. **Custom Business Metrics**: Add application-specific metrics (e.g., news fetched, briefs generated)
2. **Health Checks**: Implement `/health` endpoint for readiness/liveness probes
3. **Distributed Tracing**: Integrate OpenTelemetry for request tracing
4. **Log Correlation**: Add trace IDs to logs for easier debugging
5. **Alerting Rules**: Define Prometheus alerting rules for critical metrics
6. **Alertmanager Integration**: Set up Alertmanager for notification routing (Slack, email, PagerDuty)
7. **Long-term Storage**: Configure Thanos or Cortex for long-term metrics retention
8. **Dashboard as Code**: Version control Grafana dashboards using provisioning
