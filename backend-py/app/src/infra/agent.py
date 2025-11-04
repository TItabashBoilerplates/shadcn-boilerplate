"""このモジュールは、AssistantAgentとUserProxyAgentの設定を行います。.

AssistantAgentは、ユーザーの要求に応じて適切なアクションを実行するエージェントです。
UserProxyAgentは、ユーザーの要求をAssistantAgentに転送するエージェントです。
"""

import os

config_list = [
    {"model": "gpt-5-mini", "api_key": os.environ["OPENAI_API_KEY"]},
]
