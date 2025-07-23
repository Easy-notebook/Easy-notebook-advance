# Easy Notebook Environment Regulation - Backend v2.0

A robust, object-oriented notebook management system with AI capabilities, completely refactored following modern software engineering principles.

## 🏗️ Architecture Overview

This application has been completely refactored to implement a clean, maintainable, and scalable architecture based on:

- **SOLID Principles**: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion
- **Repository Pattern**: Clean separation between business logic and data access
- **Dependency Injection**: Loose coupling and testability
- **Domain-Driven Design**: Clear separation of concerns
- **Comprehensive Error Handling**: Custom exceptions with proper HTTP mapping
- **Structured Logging**: Request tracing and performance monitoring

### 📁 Project Structure

```
src/
├── core/                          # Core application infrastructure
│   ├── config.py                 # Configuration management with environment variables
│   ├── dependencies.py           # Dependency injection container
│   ├── exceptions.py             # Custom exception hierarchy
│   └── logging.py                # Centralized logging configuration
├── models/                        # Data models and schemas
│   ├── database.py               # SQLAlchemy database models
│   ├── schemas.py                # Pydantic request/response models
│   └── enums.py                  # Enumeration types
├── repositories/                  # Data access layer
│   ├── base_repository.py        # Generic repository with CRUD operations
│   ├── notebook_repository.py    # Notebook-specific data access
│   └── request_log_repository.py # Request logging and analytics
├── services/                      # Business logic layer
│   ├── notebook_service.py       # Notebook management logic
│   ├── kernel_service.py         # Jupyter kernel management
│   ├── file_service.py           # File handling and validation
│   └── ai_service.py             # AI/OpenAI integration
├── api/                          # API layer
│   └── v1/                       # API version 1
│       ├── endpoints/            # API endpoint modules
│       └── router.py             # Route configuration
├── agents/                       # AI agent implementations
│   ├── base_agent.py            # Base agent interface
│   └── general_agent.py         # Refactored general agent
├── scenarios/                    # Scenario handlers
│   ├── base_scenario.py         # Base scenario interface
│   └── handlers/                # Specific scenario handlers
├── utils/                        # Utility functions
│   ├── validators.py            # Input validation utilities
│   ├── helpers.py               # Helper functions
│   └── file_utils.py            # File operation utilities
└── main.py                      # Application entry point
```

## 🚀 Key Features

### ✨ New Features in v2.0

- **Strict Object-Oriented Design**: All code follows OOP principles with proper encapsulation
- **Comprehensive Error Handling**: Custom exception hierarchy with detailed error information
- **Advanced Configuration Management**: Environment-based configuration with validation
- **Request Tracing**: Full request lifecycle tracking with unique IDs
- **Performance Monitoring**: Built-in metrics and analytics
- **Data Validation**: Comprehensive input validation using Pydantic
- **Database Relationships**: Proper foreign key relationships and constraints
- **Bulk Operations**: Efficient batch processing for large datasets
- **Health Checks**: System health monitoring endpoints
- **Cleanup Jobs**: Automated cleanup of old data and resources

### 🎯 Core Functionality

- **Notebook Management**: Create, update, delete, and monitor Jupyter notebooks
- **Kernel Execution**: Manage Python kernels with timeout and cancellation support
- **File Operations**: Upload, download, and manage files with type validation
- **AI Integration**: OpenAI-powered question answering and code assistance
- **Real-time Streaming**: Server-sent events for live responses
- **Analytics**: Comprehensive usage analytics and performance metrics

## 🛠️ Installation

### Prerequisites

- Python 3.9+
- pip or poetry for dependency management
- Optional: Redis for caching
- Optional: PostgreSQL/MySQL for production database

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Easy-notebook-env-regulation/src/Backend/backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Initialize database**
   ```bash
   python -c "from src.models.database import init_database; init_database()"
   ```

## ⚙️ Configuration

The application uses a hierarchical configuration system. Create a `.env` file:

```env
# Application settings
APP_NAME="Easy Notebook Environment Regulation"
APP_VERSION="2.0.0"
ENVIRONMENT="development"
DEBUG=true

# Server settings
SERVER_HOST="0.0.0.0"
SERVER_PORT=18600
SERVER_RELOAD=true

# Database settings
DB_URL="sqlite:///./data/notebooks.db"
DB_ECHO=false

# AI/OpenAI settings
AI_API_KEY="your-openai-api-key"
AI_BASE_URL="https://api.openai.com/v1"
AI_MODEL="gpt-4"

# File settings
FILE_MAX_SIZE=10485760  # 10MB
FILE_UPLOAD_DIR="./data/notebooks"

# Kernel settings
KERNEL_EXECUTION_TIMEOUT=300
KERNEL_MAX_AGE_HOURS=24

# Logging settings
LOG_LEVEL="INFO"
LOG_FILE_PATH="./logs/app.log"
```

## 🚀 Running the Application

### Development Mode

```bash
python src/main.py
```

### Production Mode

```bash
uvicorn src.main:app --host 0.0.0.0 --port 18600 --workers 4
```

### Using Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY src/ ./src/
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "18600"]
```

## 📚 API Documentation

Once running, visit:
- **Interactive API Docs**: http://localhost:18600/docs
- **Alternative Docs**: http://localhost:18600/redoc
- **OpenAPI Spec**: http://localhost:18600/openapi.json

### Key Endpoints

#### Notebook Management
- `POST /api/v1/notebooks` - Create a new notebook
- `GET /api/v1/notebooks` - List notebooks with pagination
- `GET /api/v1/notebooks/{notebook_id}` - Get notebook details
- `PUT /api/v1/notebooks/{notebook_id}` - Update notebook
- `DELETE /api/v1/notebooks/{notebook_id}` - Delete notebook

#### Code Execution
- `POST /api/v1/execution/execute` - Execute code in a notebook
- `GET /api/v1/execution/status/{execution_id}` - Get execution status
- `POST /api/v1/execution/cancel/{execution_id}` - Cancel execution

#### File Management
- `POST /api/v1/files/upload` - Upload files to notebook
- `GET /api/v1/files/list/{notebook_id}` - List files in notebook
- `GET /api/v1/files/download/{notebook_id}/{filename}` - Download file
- `GET /api/v1/files/content` - Get file content

#### AI Operations
- `POST /api/v1/ai/operation` - Send AI operation (streaming response)

#### Monitoring
- `GET /api/v1/health` - Health check
- `GET /api/v1/metrics` - Performance metrics
- `GET /api/v1/analytics` - Usage analytics

## 🏗️ Architecture Details

### Dependency Injection

The application uses a centralized dependency injection system:

```python
from src.core.dependencies import depends

@app.post("/notebooks")
async def create_notebook(
    request: NotebookCreateRequest,
    notebook_service: NotebookService = Depends(depends.notebook_service()),
    logger = Depends(depends.request_logger())
):
    return await notebook_service.create_notebook(request)
```

### Repository Pattern

Data access is abstracted through repositories:

```python
class NotebookRepository(BaseRepository[Notebook, NotebookCreateRequest, Dict]):
    def get_active_notebooks(self, db: Session) -> List[Notebook]:
        return self.get_multi(
            db, 
            filters={"status": NotebookStatus.ACTIVE},
            order_by="last_activity",
            order_desc=True
        )
```

### Service Layer

Business logic is encapsulated in service classes:

```python
class NotebookService:
    def __init__(self, notebook_repository: NotebookRepository):
        self.notebook_repository = notebook_repository
    
    async def create_notebook(self, request: NotebookCreateRequest) -> NotebookResponse:
        # Business logic here
        pass
```

### Error Handling

Custom exceptions are automatically converted to HTTP responses:

```python
raise NotebookNotFoundError(
    message="Notebook not found",
    details={"notebook_id": notebook_id}
)
# Automatically returns HTTP 404 with structured error response
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test file
pytest tests/test_notebook_service.py

# Run with verbose output
pytest -v
```

### Test Structure

```
tests/
├── unit/                 # Unit tests
│   ├── test_repositories/
│   ├── test_services/
│   └── test_utils/
├── integration/          # Integration tests
│   ├── test_api/
│   └── test_database/
├── e2e/                 # End-to-end tests
└── fixtures/            # Test fixtures and data
```

## 📊 Monitoring and Analytics

### Health Monitoring

The application provides comprehensive health checks:

```bash
curl http://localhost:18600/api/v1/health
```

Response includes:
- Application status
- Database connectivity
- Kernel service health
- File system status
- Memory and CPU usage

### Performance Metrics

Built-in metrics collection for:
- Request response times
- Error rates
- Active notebooks
- Kernel utilization
- Database query performance

### Analytics

Usage analytics include:
- Endpoint usage statistics
- User activity patterns
- Error analysis
- Performance trends

## 🔧 Development

### Code Quality

The project uses several tools for code quality:

```bash
# Format code
black src/
isort src/

# Lint code
flake8 src/
pylint src/

# Type checking
mypy src/

# Security analysis
bandit -r src/
```

### Pre-commit Hooks

```bash
# Install pre-commit hooks
pre-commit install

# Run hooks manually
pre-commit run --all-files
```

### Adding New Features

1. **Create models** in `src/models/`
2. **Add repository methods** in `src/repositories/`
3. **Implement business logic** in `src/services/`
4. **Create API endpoints** in `src/api/v1/endpoints/`
5. **Add tests** in `tests/`
6. **Update documentation**

## 🚀 Deployment

### Production Checklist

- [ ] Set `ENVIRONMENT=production` in `.env`
- [ ] Configure production database (PostgreSQL/MySQL)
- [ ] Set up Redis for caching
- [ ] Configure reverse proxy (Nginx)
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Configure log aggregation
- [ ] Set up automated backups
- [ ] Enable SSL/TLS

### Docker Deployment

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "18600:18600"
    environment:
      - DB_URL=postgresql://user:pass@db:5432/notebooks
    depends_on:
      - db
      - redis
  
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: notebooks
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
  
  redis:
    image: redis:7-alpine
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the coding standards
4. Add tests for new functionality
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Coding Standards

- Follow PEP 8 for Python code style
- Use type hints for all function parameters and return values
- Write comprehensive docstrings for all classes and methods
- Add unit tests for all new functionality
- Keep functions small and focused (max 20-30 lines)
- Use meaningful variable and function names

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- FastAPI for the excellent web framework
- SQLAlchemy for powerful ORM capabilities
- Jupyter for notebook kernel management
- OpenAI for AI integration capabilities
- The Python community for amazing libraries

## 📞 Support

For support, please:
1. Check the [documentation](docs/)
2. Search [existing issues](issues)
3. Create a new issue with detailed information
4. Contact the development team

---

**Built with ❤️ using modern Python and software engineering best practices** 