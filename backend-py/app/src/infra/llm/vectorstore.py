from infra.supabase_client import SupabaseClient
from langchain_community.vectorstores.supabase import SupabaseVectorStore
from langchain_core.embeddings import Embeddings


class VectorStoreFactory:
    @staticmethod
    def get_vectorstore(
        embedding: Embeddings,
        table_name: str,
        query_name: str = "match_documents_with_rls",
    ) -> SupabaseVectorStore:
        """Get vector store based on the embedding and table name.

        Args:
            embedding (Embeddings): The embedding object to use for the vector store.
            table_name (str): The name of the table in the database to use for the vector store.
            query_name (str, optional): The name of the query to use for similarity search. Defaults to "match_documents_with_rls".

        Returns:
            SupabaseVectorStore: The vector store object.
        """
        supabase = SupabaseClient()
        return SupabaseVectorStore(
            client=supabase.client,
            embedding=embedding,
            table_name=table_name,
            query_name=query_name,
        )
