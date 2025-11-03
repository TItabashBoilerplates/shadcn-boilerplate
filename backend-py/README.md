# Backend Python (FastAPI)

FastAPI backend with Clean Architecture, comprehensive AI/ML integration, and strict code quality standards.

## Overview

This backend follows **Clean Architecture** principles with clear separation of concerns across multiple layers. Built with FastAPI, it provides a robust foundation for AI-powered applications with support for LLM orchestration, vector search, real-time communication, and more.

### Tech Stack

- **Framework**: FastAPI (async Python web framework)
- **Architecture**: Clean Architecture (Controller/UseCase/Gateway/Domain/Infra)
- **ORM**: SQLModel (SQLAlchemy + Pydantic integration)
- **Database**: PostgreSQL (via Supabase)
- **Package Manager**: uv (Rust-based Python package manager)
- **Code Quality**: Ruff (linter), MyPy (type checker), pytest (testing)

## Clean Architecture Structure

```
backend-py/app/src/
├── controller/           # HTTP request/response handling only
│   └── base_controller.py
├── usecase/              # Business logic orchestration
│   └── chat_usecase.py
├── gateway/              # Data access abstraction interfaces
│   ├── chat_room_gateway.py
│   ├── message_gateway.py
│   ├── openai_gateway.py
│   └── ...
├── domain/               # Entities and business models
│   ├── entity/
│   │   ├── models.py     # SQLModel (sqlacodegen generated)
│   │   └── chat.py       # Request/response models
│   └── service/
│       └── rag_service.py
├── infra/                # External dependencies implementation
│   ├── db_client.py
│   ├── supabase_client.py
│   └── agent.py
├── middleware/           # Authentication, CORS, logging
│   └── auth_middleware.py
└── app.py                # FastAPI application entry point
```

## Layer Responsibilities

### Controller Layer

**Responsibility**: HTTP request/response handling ONLY

- Extract request data
- Call use cases
- Return HTTP responses
- NO business logic

**Example**:
```python
@router.post("/api/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    session: Session = Depends(get_session),
    auth_header: str = Depends(authorization_header),
) -> ChatResponse:
    """Chat endpoint - delegates all logic to use case"""
    token = auth_header.split(" ")[1]
    use_case = ChatUseCase(access_token=token)
    return use_case.execute(request, session)
```

### UseCase Layer

**Responsibility**: Business logic orchestration

- Coordinate multiple gateways
- Implement business workflows
- Transaction management
- Error handling

**Example**:
```python
class ChatUseCase:
    def __init__(self, access_token: str | None = None):
        self.current_user_gateway = CurrentUserGateway(access_token)
        self.chat_room_gateway = ChatRoomGateway()
        self.message_gateway = MessageGateway()
        self.openai_gateway = OpenAIGateway()
        self.embeddings_gateway = EmbeddingsGateway()
        # ... initialize all required gateways

    def execute(self, request: ChatRequest, session: Session) -> ChatResponse:
        # 1. Authenticate user
        current_user = self.current_user_gateway.get_current_user(session)

        # 2-6. Manage chat room, virtual user, etc.
        chat_room = self.chat_room_gateway.get_or_create(...)

        # 7. Save user message
        user_message = self.message_gateway.create(...)

        # 8. Search similar embeddings
        embeddings = self.embeddings_gateway.search_similar(...)

        # 9. Get AI response
        ai_response = self.openai_gateway.chat_completion(...)

        # 10-11. Save AI message and return response
        return ChatResponse(...)
```

### Gateway Layer

**Responsibility**: Data access abstraction

- Define interfaces for data operations
- Implement CRUD operations
- Abstract external service calls
- Testable through dependency injection

**Available Gateways**:

| Gateway | Purpose |
|---------|---------|
| `ChatRoomGateway` | Chat room CRUD, UserChats relationships |
| `MessageGateway` | Message CRUD operations |
| `VirtualUserGateway` | Virtual user management |
| `CurrentUserGateway` | Get current user from Supabase |
| `UserProfileGateway` | User profile get/create |
| `EmbeddingsGateway` | pgvector search operations |
| `OpenAIGateway` | LangChain OpenAI API calls |

**Example**:
```python
class OpenAIGateway:
    def __init__(self, model: str = "gpt-4", temperature: float = 0.7):
        self.llm = ChatOpenAI(
            model=model,
            temperature=temperature,
            openai_api_key=os.getenv("OPENAI_API_KEY"),
        )

    def chat_completion(
        self,
        user_message: str,
        system_prompt: str | None = None,
        context: str | None = None,
    ) -> str:
        messages = [
            SystemMessage(content=system_prompt or "You are a helpful assistant."),
            HumanMessage(content=f"Context: {context}\n\nUser: {user_message}"),
        ]
        response = self.llm.invoke(messages)
        return response.content
```

### Domain Layer

**Responsibility**: Business entities and models

- **Entity**: SQLModel models (database tables)
- **Service**: Domain services (RAG, business rules)
- **Types**: Pydantic models for API

**Example**:
```python
# domain/entity/models.py (auto-generated by sqlacodegen)
class GeneralUsers(SQLModel, table=True):
    __tablename__ = 'general_users'
    id: UUID = Field(primary_key=True)
    display_name: str
    account_name: str
    created_at: datetime
    updated_at: datetime

# domain/entity/chat.py (manual Pydantic models)
class ChatRequest(BaseModel):
    message: str
    chat_room_id: int | None = None

class ChatResponse(BaseModel):
    chat_room_id: int
    user_message_id: int
    ai_message_id: int
    ai_response: str
```

### Infrastructure Layer

**Responsibility**: External system integration

- Database connection management
- Supabase client initialization
- Third-party API clients
- LLM agent configuration

**Example**:
```python
# infra/db_client.py
def get_engine():
    return create_engine(os.getenv("DATABASE_URL"))

# infra/supabase_client.py
class SupabaseClient:
    def __init__(self, access_token: str):
        self.client = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
        )
        self.access_token = access_token
```

### Middleware Layer

**Responsibility**: Cross-cutting concerns

- Authentication (Bearer token verification)
- CORS handling
- Request/response logging
- Error handling

**Example**:
```python
async def verify_token(auth_header: str = Depends(authorization_header)) -> User:
    """Verify Bearer token with Supabase"""
    token = auth_header.split(" ")[1]
    supabase_client = SupabaseClient(access_token=token)
    user = supabase_client.get_user()

    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    return user
```

## AI/ML Integration

This backend includes comprehensive AI/ML capabilities.

### LLM Orchestration

**LangChain Ecosystem**:
- `langchain` - Core LLM workflow construction
- `langchain-community` - Community integrations
- `langchain-anthropic` - Claude integration
- `langchain-openai` - OpenAI integration
- `langchain-postgres` - PostgreSQL vector store
- `langgraph` - Stateful agent implementation
- `langchainhub` - Prompt template management
- `langsmith` - Monitoring and debugging

**Multi-Agent Systems**:
- `pyautogen` - AutoGen multi-agent framework

### LLM Providers

| Provider | Library | Purpose |
|----------|---------|---------|
| OpenAI | `openai`, `langchain-openai` | GPT-4, DALL-E, Whisper |
| Anthropic | `langchain-anthropic` | Claude models |
| Replicate | `replicate` | Open-source models |
| FAL | `fal-client` | Fast AI inference |
| RunPod | `runpod` | GPU inference |
| Modal | `modal` | Containerized inference |

### Deep Learning & ML

- **PyTorch** (`torch`) - Deep learning framework
- **Diffusers** (`diffusers`) - Image generation (Stable Diffusion)
- **Transformers** (`transformers`) - HuggingFace models
- **Accelerate** (`accelerate`) - Distributed training optimization

### Real-time Communication

- **LiveKit** (`livekit`, `livekit-api`) - WebRTC audio/video
- **aiortc** - WebRTC implementation

### Voice & Audio

- **Cartesia** (`cartesia`) - Voice synthesis API

### Vector Search

- **pgvector** (PostgreSQL extension) - Vector similarity search
- Integrated with LangChain for RAG (Retrieval Augmented Generation)

### Message Queue

- **kombu** - Message broker abstraction
- **tembo-pgmq-python** - PostgreSQL-based message queue

### RAG Implementation

```python
# domain/service/rag_service.py
class RAGService:
    def __init__(self):
        self.llm = ChatOpenAI()
        self.embeddings_gateway = EmbeddingsGateway()

    def retrieve_and_generate(self, query: str, user_id: str) -> str:
        # 1. Search similar embeddings
        similar_docs = self.embeddings_gateway.search_similar(
            query_embedding=self.get_embedding(query),
            user_id=user_id,
            limit=5
        )

        # 2. Construct context
        context = "\n\n".join([doc.content for doc in similar_docs])

        # 3. Generate response with context
        return self.llm.invoke([
            SystemMessage(content="Answer based on the context provided."),
            HumanMessage(content=f"Context: {context}\n\nQuestion: {query}")
        ]).content
```

## Development

### Getting Started

```bash
# Install dependencies (from project root)
make init

# Start backend services
make run

# Or manually with Docker
cd backend-py
docker-compose up
```

### Common Commands

```bash
# Linting & Formatting
make lint-backend-py         # Ruff lint (auto-fix)
make lint-backend-py-ci      # Ruff lint (CI, no fix)
make format-backend-py       # Ruff format (auto-fix)
make format-backend-py-check # Ruff format check

# Type Checking
make type-check-backend-py   # MyPy type check (strict mode)

# Testing
cd backend-py/app
pytest                       # Run all tests
pytest --cov                 # Run with coverage
pytest -v                    # Verbose output
pytest -k test_name          # Run specific test
```

### Package Management (uv)

This project uses **uv**, a Rust-based Python package manager (from Ruff creators).

```bash
cd backend-py/app

# Install all dependencies
uv sync

# Install production dependencies only
uv sync --no-dev

# Add new dependency
uv add <package-name>

# Add dev dependency
uv add --dev <package-name>

# Update dependencies
uv lock --upgrade
```

## Code Quality

### Ruff Configuration

**Settings** (in `pyproject.toml`):
- **Line length**: 88 characters
- **Target**: Python 3.12
- **Max complexity**: 3 (McCabe)
- **Docstring style**: Google
- **Exclude**: Auto-generated `models.py`

### MyPy Configuration

**Settings** (in `pyproject.toml`):
- **Python version**: 3.12
- **Strict mode**: Enabled
- **No implicit optional**: Enforced
- **Warn on unused ignores**: Enabled

### Testing with pytest

**Configuration** (in `pyproject.toml`):
- **Test discovery**: `tests/` directory
- **Test patterns**: `test_*.py`, `*_test.py`
- **Coverage**: HTML + terminal reports
- **Async support**: pytest-asyncio

**Example Test**:
```python
def test_health_check(client):
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

## Docker Configuration

### Development Dockerfile

```dockerfile
FROM python:3.13-slim-bookworm

# Install uv
RUN pip install uv

# Set working directory
WORKDIR /service/app

# Copy dependencies
COPY pyproject.toml uv.lock ./

# Install dependencies
RUN uv sync

# Copy application
COPY . .

# Run server
CMD ["uvicorn", "src.app:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Production Dockerfile (Multi-stage)

```dockerfile
# Builder stage
FROM python:3.13-slim-bookworm AS builder
RUN pip install uv
WORKDIR /service/app
COPY pyproject.toml uv.lock ./
RUN uv sync --no-dev

# Production stage
FROM python:3.12-slim-bookworm
WORKDIR /service/app
COPY --from=builder /service/app/.venv ./.venv
COPY . .
USER appuser
CMD ["uvicorn", "src.app:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Environment Variables

Backend environment variables are managed in `env/backend/local.env`.

### Required Variables

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
```

### Optional AI/ML Variables

```env
ANTHROPIC_API_KEY=your-anthropic-key
REPLICATE_API_TOKEN=your-replicate-token
LANGSMITH_API_KEY=your-langsmith-key
LANGSMITH_PROJECT=your-project-name
LIVEKIT_API_KEY=your-livekit-key
LIVEKIT_API_SECRET=your-livekit-secret
```

## Best Practices

### Clean Architecture Rules

1. **Controllers**: Keep thin, delegate to use cases
2. **Use Cases**: Orchestrate gateways, implement business logic
3. **Gateways**: Abstract data access, enable testing
4. **Domain**: Pure business logic, no external dependencies
5. **Infrastructure**: Implement gateway interfaces

### Code Style

1. **Type hints**: Always use type annotations
2. **Async/await**: Use for all I/O operations
3. **Docstrings**: Google-style for all public functions
4. **Error handling**: Use appropriate exception types
5. **Logging**: Use structured logging

### Testing Strategy

1. **Unit tests**: Test gateways and domain logic in isolation
2. **Integration tests**: Test use cases with real database
3. **End-to-end tests**: Test API endpoints
4. **Mocking**: Mock external services (OpenAI, Supabase, etc.)
5. **Coverage**: Aim for >80% code coverage

### Performance

1. **Connection pooling**: Use SQLModel's connection pool
2. **Async operations**: Leverage FastAPI's async capabilities
3. **Caching**: Cache LLM responses when appropriate
4. **Batch operations**: Use batch inserts for embeddings
5. **Monitoring**: Use LangSmith for LLM call monitoring

## Troubleshooting

### Database Connection Issues

```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Test connection
cd backend-py/app
python -c "from src.infra.db_client import get_engine; print(get_engine())"
```

### Type Check Failures

```bash
# Run MyPy with verbose output
cd backend-py/app
mypy src/ --show-error-codes
```

### Import Errors

```bash
# Ensure PYTHONPATH is set
export PYTHONPATH=/service/app/src

# Or run from app directory
cd backend-py/app
python -m pytest
```

### LLM API Errors

```bash
# Check API keys
echo $OPENAI_API_KEY
echo $ANTHROPIC_API_KEY

# Test OpenAI connection
python -c "from openai import OpenAI; print(OpenAI().models.list())"
```

## Model Generation

### SQLModel Generation

Generate SQLModel models from database schema:

```bash
cd backend-py/app
sqlacodegen postgresql://user:pass@host:port/db > src/domain/entity/models.py
```

**Note**: This is typically done after Drizzle migrations are applied.

## API Documentation

FastAPI automatically generates interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI Schema**: http://localhost:8000/openapi.json

## Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [SQLModel Documentation](https://sqlmodel.tiangolo.com)
- [LangChain Documentation](https://python.langchain.com)
- [Ruff Documentation](https://docs.astral.sh/ruff/)
- [MyPy Documentation](https://mypy.readthedocs.io)
- [pytest Documentation](https://docs.pytest.org)
- [uv Documentation](https://github.com/astral-sh/uv)

For project-specific guidelines, see `/CLAUDE.md` in the project root.
