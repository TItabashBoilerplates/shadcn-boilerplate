import os

from langchain_anthropic import Anthropic, ChatAnthropic
from langchain_community.chat_models import ChatOllama, ChatPerplexity
from langchain_community.embeddings import CohereEmbeddings, OllamaEmbeddings
from langchain_core.embeddings import Embeddings
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_openai import ChatOpenAI, OpenAI, OpenAIEmbeddings


class LLMFactory:
    @staticmethod
    def get_chat(mode: str, model: str) -> BaseChatModel:
        """Get chat object based on the mode and model"""
        if mode == "gpt":
            return ChatOpenAI(
                openai_api_key=os.environ.get("OPENAI_API_KEY"),
                model=model,
            )
        if mode == "claude":
            return ChatAnthropic(
                model=model,
                anthropic_api_key=os.environ.get("ANTHROPIC_API_KEY"),
            )
        if mode == "perplexity":
            return ChatPerplexity(
                model=model,
                api_key=os.environ.get("PERPLEXITY_API_KEY"),
            )
        if mode == "ollama":
            return ChatOllama(model=model, base_url=os.environ.get("AI_APP_URL"))
        raise NotImplementedError(f"Invalid model name: {mode}")

    @staticmethod
    def get_llm(mode: str, model: str) -> OpenAI | Anthropic | None:
        """Get LLM object based on the mode and model"""
        if mode == "gpt":
            return OpenAI(openai_api_key=os.environ.get("OPENAI_API_KEY"), model=model)
        if mode == "claude":
            return Anthropic(model=model, api_key=os.environ.get("ANTHROPIC_API_KEY"))
        if mode in {"perplexity", "ollama"}:
            return None
        raise NotImplementedError(f"Invalid model name: {mode}")


class EmbeddingFactory:
    @staticmethod
    def get_embedding(mode: str, model: str) -> Embeddings | None:
        """Get embedding object based on the mode"""
        if mode == "gpt":
            return OpenAIEmbeddings(openai_api_key=os.environ.get("OPENAI_API_KEY"))
        if mode == "ollama":
            return OllamaEmbeddings(base_url=os.environ.get("AI_APP_URL"), model=model)
        if mode == "cohere":
            return CohereEmbeddings(
                cohere_api_key=os.environ.get("COHERE_API_KEY"),
                model=model,
            )
        if mode in {"claude", "perplexity"}:
            return None
        raise NotImplementedError(f"Embedding not implemented for mode: {mode}")
