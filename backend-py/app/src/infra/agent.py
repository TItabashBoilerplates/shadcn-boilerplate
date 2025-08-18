"""このモジュールは、AssistantAgentとUserProxyAgentの設定を行います。

AssistantAgentは、ユーザーの要求に応じて適切なアクションを実行するエージェントです。
UserProxyAgentは、ユーザーの要求をAssistantAgentに転送するエージェントです。
"""

import os

config_list = [
    # {
    #     "model": "llama3",
    #     "base_url": os.environ.get("AI_APP_URL"),
    #     "api_key": "ollama",
    # },
    {"model": "gpt-4o-mini", "api_key": os.environ["OPENAI_API_KEY"]}
]
