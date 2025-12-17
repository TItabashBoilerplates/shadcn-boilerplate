"""OpenAI Gateway using LangChain."""

import os
from typing import Any

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI


class OpenAIGateway:
    """Gateway for OpenAI API calls using LangChain."""

    def __init__(self, model: str = "gpt-5.2-mini", temperature: float = 0.7) -> None:
        """Initialize OpenAI Gateway.

        Args:
            model: OpenAI model name (default: gpt-5.2-mini)
            temperature: Response randomness (0.0-1.0)
        """
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            msg = "OPENAI_API_KEY environment variable is not set"
            raise ValueError(msg)

        # ChatOpenAI automatically reads OPENAI_API_KEY from environment
        self.llm = ChatOpenAI(
            model=model,
            temperature=temperature,
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
        messages: list[BaseMessage] = []

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

        # response.content can be str or list, so we need to handle both
        content: str | list[str | dict[str, Any]] = response.content
        if isinstance(content, str):
            return content
        # If content is a list, join it into a string
        return "".join(str(item) for item in content)
