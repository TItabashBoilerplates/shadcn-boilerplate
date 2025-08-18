from pydantic import BaseModel

from gateway.llm_gateway import LLMGateway
from gateway.vectorstore_gateway import VectorStoreGateway


class RAGService:
    def __init__(
        self,
        llm_gateway: LLMGateway,
        vector_store_gateway: VectorStoreGateway,
    ):
        self.llm_gateway = llm_gateway
        self.vector_store_gateway = vector_store_gateway

    def generate_text_from_rag(self, prompt: str) -> str:
        """LLMモデルを使用してRAGからレスポンスを生成します。"""
        response: str = self.llm_gateway.generate_text_from_rag(
            prompt, self.vector_store_gateway.as_retriever()
        )
        return response

    def generate_model_from_rag(
        self,
        prompt: str,
        pydantic_model: type[BaseModel],
    ) -> BaseModel:
        """LLMモデルを使用してRAGから構造化されたレスポンスを生成します。"""
        result: BaseModel = self.llm_gateway.generate_model_from_rag(
            prompt,
            pydantic_model,
            self.vector_store_gateway.as_retriever(),
        )

        return result


def main() -> None:
    # mode = "ollama"
    # model = "llama3:8b"
    table_name = "embeddings"
    query_name = "match_documents"

    llm_gateway = LLMGateway()
    vector_store_gateway = VectorStoreGateway(
        table_name=table_name,
        query_name=query_name,
    )

    rag_service = RAGService(llm_gateway, vector_store_gateway)

    # Add some example texts to the vector store
    eids = vector_store_gateway.add_texts(
        texts=["This is a sample text", "Another example document"],
        user_id="user1",
    )

    prompt = "こんにちはお元気ですか？"
    response = llm_gateway.generate_text(prompt, "AIの返答")
    print(response)

    rag_response = rag_service.generate_text_from_rag(
        "サンプルテキストを教えてください。",
    )
    print(rag_response)

    # vector_store_gateway.delete_texts(eids)


if __name__ == "__main__":
    main()
