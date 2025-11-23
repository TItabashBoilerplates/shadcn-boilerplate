# Special Notes

## Type Generation

Generate types for each platform from Drizzle schema:

- **Frontend**: Supabase TypeScript type generation (`make build-model-frontend`)
- **Backend Python**: SQLModel (generated directly from database with sqlacodegen)
- **Edge Functions**:
  - Supabase TypeScript type generation (`supabase gen types typescript`)
  - **NEW**: Copy Drizzle schema to `supabase/functions/shared/drizzle/` (`make build-model-functions`)
  - Type inference possible with `InferSelectModel` / `InferInsertModel`

## AI/ML Features

This project integrates comprehensive AI/ML capabilities:

- **Vector Search**: pgvector (PostgreSQL extension) for vector similarity search
- **LLM Orchestration**: LangChain/LangGraph for complex AI workflow construction
- **LLM Providers**: OpenAI (GPT-4), Anthropic (Claude), Replicate, FAL
- **Image Generation**: Diffusers (Stable Diffusion, etc.), DALL-E
- **Deep Learning**: PyTorch, Transformers (HuggingFace), Accelerate
- **Real-time Communication**: LiveKit (WebRTC audio/video), aiortc
- **Voice Synthesis**: Cartesia API
- **RAG (Retrieval Augmented Generation)**: Vector search + LLM integration
- **Message Queue**: kombu, tembo-pgmq-python (PostgreSQL-based)
- **Monitoring**: LangSmith (debugging and tracing)

For a detailed list of integrated libraries, see the "AI/ML Integration Details" section.

## Authentication

- Supabase auth integration
- JWT token verification middleware
- User context properly typed throughout application

## Development Workflow

- Use `make` commands for consistency across team
- Environment variables managed through dotenvx
- Docker compose for service orchestration
- Supports multiple development environments (local, staging, production)
