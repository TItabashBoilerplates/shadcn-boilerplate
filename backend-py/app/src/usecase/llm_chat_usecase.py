from domain.entity.chat_response import ChatResponse
from gateway.llm_gateway import LLMGateway


class LLMChatUsecase:
    def __init__(self):
        return

    def execute(self, prompt: str) -> ChatResponse:
        self.gateway = LLMGateway()
        system_message = "AIからの返信"
        response_text = self.gateway.generate_model(
            prompt,
            system_message,
            ChatResponse,
        )
        return response_text
