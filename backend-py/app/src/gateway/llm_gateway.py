from logging import getLogger

from langchain_core.documents import Document
from langchain_core.output_parsers import PydanticOutputParser, StrOutputParser
from langchain_core.prompts import (
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    MessagesPlaceholder,
    SystemMessagePromptTemplate,
)
from langchain_core.retrievers import BaseRetriever
from langchain_core.runnables import RunnablePassthrough
from pydantic import BaseModel

from gateway.const.default_template import DEFAULT_HUMAN_MESSAGE, DEFAULT_SYSTEM_MESSAGE
from gateway.const.rag_template import rag_template_raw
from infra.llm.llm_factory import LLMFactory
from infra.llm.memory import MemoryEnabledRunnable

logger = getLogger("uvicorn")


class LLMGateway:
    def __init__(
        self,
        mode: str = "gpt",
        model: str = "gpt-4o-mini",
    ) -> None:
        """Initializes the LLMGateway."""
        self.mode = mode
        self.model = model
        self.chat = LLMFactory.get_chat(mode, model)
        self.llm = LLMFactory.get_llm(mode, model)

    def generate_text(
        self,
        prompt: str,
        system_message: str = DEFAULT_SYSTEM_MESSAGE,
        human_message: str = DEFAULT_HUMAN_MESSAGE,
        session_id: str | None = None,
    ) -> str:
        """Generates a response to the prompt."""
        message_prompt = ChatPromptTemplate(
            messages=[
                MessagesPlaceholder(variable_name="history"),
                SystemMessagePromptTemplate.from_template(system_message),
                HumanMessagePromptTemplate.from_template(human_message),
            ],
            partial_variables={"format_instructions": StrOutputParser()},
        )

        chain = message_prompt | self.chat | StrOutputParser()
        runnable_with_history = MemoryEnabledRunnable(
            chain,
            input_messages_key="query",
            history_messages_key="history",
        )

        response: str = runnable_with_history.invoke(
            {"query": prompt},
            session_id=session_id,
        )
        logger.info(f"Generated text: {response}")
        return response

    def generate_model(
        self,
        prompt: str,
        pydantic_model: type[BaseModel],
        system_message: str = DEFAULT_SYSTEM_MESSAGE,
        human_message: str = DEFAULT_HUMAN_MESSAGE,
    ) -> BaseModel:
        """Generates a response to the prompt."""
        parser: PydanticOutputParser[BaseModel] = PydanticOutputParser(
            pydantic_object=pydantic_model,
        )
        message_prompt = ChatPromptTemplate(
            messages=[
                SystemMessagePromptTemplate.from_template(system_message),
                HumanMessagePromptTemplate.from_template(human_message),
            ],
            partial_variables={
                "format_instructions": parser.get_format_instructions(),
            },
        )
        chain = (
            {"query": RunnablePassthrough()}
            | message_prompt
            | self.chat.with_structured_output(pydantic_model)
        )
        result: BaseModel = chain.invoke(prompt)
        return result

    def generate_text_from_rag(self, prompt: str, retriever: BaseRetriever) -> str:
        """Generates a response from the LLM model using RAG."""
        rag_prompt = ChatPromptTemplate(
            messages=[
                HumanMessagePromptTemplate.from_template(rag_template_raw),
            ],
        )
        rag_chain = (
            {
                "context": retriever | self._format_docs,
                "question": RunnablePassthrough(),
            }
            | rag_prompt
            | self.chat
            | StrOutputParser()
        )
        result: str = rag_chain.invoke(prompt)
        return result

    def generate_model_from_rag(
        self,
        prompt: str,
        pydantic_model: type[BaseModel],
        retriever: BaseRetriever,
    ) -> BaseModel:
        """Generates a structured response from the LLM model using RAG."""
        parser: PydanticOutputParser[BaseModel] = PydanticOutputParser(
            pydantic_object=pydantic_model,
        )
        rag_prompt = ChatPromptTemplate(
            messages=[
                HumanMessagePromptTemplate.from_template(
                    rag_template_raw + "\n{format_instructions}\n",
                ),
            ],
            partial_variables={
                "format_instructions": parser.get_format_instructions(),
            },
        )
        rag_chain = (
            {
                "context": retriever | self._format_docs,
                "question": RunnablePassthrough(),
            }
            | rag_prompt
            | self.chat.with_structured_output(pydantic_model)
        )
        result: BaseModel = rag_chain.invoke(prompt)
        return result

    def _format_docs(self, docs: list[Document]) -> str:
        """Formats the documents."""
        print(", ".join(doc.page_content for doc in docs))
        return "\n\n".join(doc.page_content for doc in docs)
