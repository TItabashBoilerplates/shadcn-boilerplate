from logging import getLogger
from typing import Any, List, Optional

from langchain_core.retrievers import BaseRetriever
from langchain_core.vectorstores import VectorStoreRetriever

from infra.llm.llm_factory import EmbeddingFactory
from infra.llm.vectorstore import VectorStoreFactory

logger = getLogger("uvicorn")


class VectorStoreGateway:
    def __init__(
        self,
        table_name: str,
        query_name: str = "match_documents",
        mode: str = "gpt",
        model: str = "gpt-4o-mini",
    ) -> None:
        """Initializes the VectorStoreGateway."""
        self.mode = mode
        self.model = model
        self.embedding = EmbeddingFactory.get_embedding(mode, model)
        self.vectorstore = VectorStoreFactory.get_vectorstore(
            self.embedding,
            table_name,
            query_name,
        )

    def similarity_search(self, query: str, k: int = 4) -> list[str]:
        """Performs a similarity search using the vectorstore."""
        results = self.vectorstore.similarity_search(query, k=k)
        return [doc.page_content for doc in results]

    def add_texts(
        self,
        texts: list[str],
        ids: list[str] | None = None,
        user_id: str | None = None,
    ) -> list[str]:
        """Adds texts to the vectorstore."""
        metadatas = [{"user_id": user_id} for _ in texts] if user_id else None
        results: list[str] = self.vectorstore.add_texts(
            texts=texts,
            ids=ids,
            metadatas=metadatas,
        )
        return results

    def add_text(
        self,
        text: str,
        eid: str | None = None,
        user_id: str | None = None,
    ) -> list[str]:
        """Adds a single text to the vectorstore."""
        result: list[str] = self.vectorstore.add_texts(
            texts=[text],
            ids=[eid] if eid else None,
            metadatas=[{"user_id": user_id}] if user_id else None,
        )
        return result

    def delete_texts(self, ids: list[str]) -> list[str]:
        """Deletes texts from the vectorstore."""
        results: list[str] = self.vectorstore.delete(ids=ids)
        return results

    def delete_text(self, eid: str) -> list[str]:
        """Deletes a single text from the vectorstore."""
        results: list[str] = self.vectorstore.delete(ids=[eid])
        return results

    def embed_documents(self, documents: list[str]) -> list[list[float]]:
        """Embeds a list of documents."""
        if self.embedding is None:
            error_message = f"{self.mode} does not support document embedding."
            raise ValueError(error_message)
        results: list[list[float]] = self.embedding.embed_documents(documents)
        return results

    def embed_query(self, query: str) -> list[float]:
        """Embeds a query."""
        if self.embedding is None:
            error_message = f"{self.mode} does not support document embedding."
            raise ValueError(error_message)
        result: list[float] = self.embedding.embed_query(query)
        return result

    def as_retriever(self, search_kwargs: dict[str, Any] = {"k": 4}) -> BaseRetriever:
        """Returns the vectorstore as a retriever."""
        retriever: BaseRetriever = self.vectorstore.as_retriever(
            search_kwargs=search_kwargs,
        )
        return retriever
