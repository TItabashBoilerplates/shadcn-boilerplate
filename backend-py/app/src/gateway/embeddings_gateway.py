"""Embeddings Gateway for vector search."""

from sqlmodel import Session, func, select

from src.domain.entity.models import Embeddings


class EmbeddingsGateway:
    """Gateway for embeddings operations."""

    def count_by_user(self, user_id: str, session: Session) -> int:
        """Count embeddings for a user.

        Args:
            user_id: User ID
            session: Database session

        Returns:
            Number of embeddings
        """
        statement = select(func.count(Embeddings.id)).where(
            Embeddings.metadata_["user_id"].astext == user_id
        )
        return session.exec(statement).one()

    def search_similar(
        self,
        query: str,
        limit: int,
        session: Session,
    ) -> list[Embeddings]:
        """Search for similar embeddings.

        Args:
            query: Search query
            limit: Maximum number of results
            session: Database session

        Returns:
            List of similar embeddings
        """
        # Simplified implementation - in production, you would:
        # 1. Generate embedding for query using OpenAI embeddings API
        # 2. Use pgvector similarity search
        # For now, just return the most recent embeddings
        statement = select(Embeddings).limit(limit)
        return list(session.exec(statement).all())

    def get_all(self, session: Session) -> list[Embeddings]:
        """Get all embeddings.

        Args:
            session: Database session

        Returns:
            List of all embeddings
        """
        statement = select(Embeddings)
        return list(session.exec(statement).all())
