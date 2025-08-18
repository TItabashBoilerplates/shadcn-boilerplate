from logging import getLogger
from typing import Any

from langchain.memory import ChatMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import BaseMessage
from langchain_core.runnables import RunnableSerializable, RunnableWithMessageHistory

logger = getLogger("uvicorn")


class MemoryEnabledRunnable:
    def __init__(
        self,
        runnable: RunnableSerializable,
        input_messages_key: str = "query",
        history_messages_key: str = "history",
        memory_args: dict[str, Any] | None = None,
        memory_class: Any = ChatMessageHistory,
    ):
        self.runnable = runnable
        self.memory_class = memory_class
        self.input_messages_key = input_messages_key
        self.history_messages_key = history_messages_key
        self.memory_args = memory_args or {}
        self.store: dict[str, BaseChatMessageHistory] = {}

        self.runnable_with_history = RunnableWithMessageHistory(
            runnable=self.runnable,
            get_session_history=self._get_session_history,
            input_messages_key=self.input_messages_key,
            history_messages_key=self.history_messages_key,
        )

    def invoke(
        self,
        prompt: Any,
        session_id: str,
    ) -> Any:
        """Invokes the runnable with the given input and configuration."""
        return self.runnable_with_history.invoke(
            prompt,
            config={"configurable": {"session_id": session_id}},
        )

    def _get_session_history(self, session_id: str) -> BaseChatMessageHistory:
        if session_id not in self.store:
            self.store[session_id] = self.memory_class(**self.memory_args)
        return self.store[session_id]

    def get_memory(self) -> BaseChatMessageHistory:
        """Returns the memory object used by the runnable."""
        return self.runnable_with_history.get_session_history()

    def clear_memory(self) -> None:
        """Clears the conversation history from memory."""
        self.get_memory().clear()

    def get_history(self) -> list[BaseMessage]:
        """Retrieves the current conversation history from memory."""
        return self.get_memory().messages

    def add_message(self, message: BaseMessage) -> None:
        """Adds a new message to the conversation history."""
        self.get_memory().add_message(message=message)

    def set_memory_args(self, **kwargs: Any) -> None:
        """Updates the memory arguments and reinitializes the memory object."""
        self.memory_args.update(kwargs)
        new_memory = self.memory_class(**self.memory_args)
        self.runnable_with_history.get_session_history = new_memory
