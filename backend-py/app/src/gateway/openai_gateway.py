"""OpenAI Gateway using LangChain."""

import os

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI


class OpenAIGateway:
    """Gateway for OpenAI API calls using LangChain."""

    def __init__(self, model: str = "gpt-5-mini", temperature: float = 0.7):
        """Initialize OpenAI Gateway.

        Args:
            model: OpenAI model name (default: gpt-5-mini)
            temperature: Response randomness (0.0-1.0)
        """
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is not set")

        self.llm = ChatOpenAI(
            model=model,
            temperature=temperature,
            openai_api_key=api_key,
        )

    def chat_completion(
        self,
        user_message: str,
        system_prompt: str | None = None,
        context: str | None = None,
    ) -> str:
        """Generate chat completion.

        Args:
            user_message: User's message
            system_prompt: System prompt (optional)
            context: Additional context from embeddings (optional)

        Returns:
            AI response text
        """
        messages = []

        # Add system prompt
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))

        # Add context from embeddings if available
        if context:
            context_message = f"参考情報:\n{context}\n\n"
            user_message = context_message + user_message

        # Add user message
        messages.append(HumanMessage(content=user_message))

        # Get response from OpenAI
        response = self.llm.invoke(messages)

        return response.content
