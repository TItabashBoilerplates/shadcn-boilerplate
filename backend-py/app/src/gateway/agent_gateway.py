from typing import Dict, Any, Optional, List, Annotated
from autogen import ConversableAgent, GroupChat, GroupChatManager, UserProxyAgent
from pydantic import BaseModel, Field
from infra.agent import config_list
from pydantic import BaseModel, Field


class AgentGateway:
    def __init__(self, default_config: Optional[List[Dict[str, Any]]] = None) -> None:
        self.config_list = default_config or config_list

    def set_config(self, new_config: List[Dict[str, Any]]) -> None:
        """設定リストを更新します"""
        self.config_list = new_config

    def create_agent(
        self,
        name: str,
        system_message: str,
        description: str,
        human_input_mode: str = "NEVER",
        llm_config: dict[str, Any] | None = None,
        **kwargs: Any,
    ) -> ConversableAgent:
        """エージェントを作成します"""
        agent_config = {
            "name": name,
            "system_message": system_message,
            "llm_config": llm_config or {"config_list": self.config_list},
            "human_input_mode": human_input_mode,
            "description": description,
            **kwargs,
        }
        return ConversableAgent(**agent_config)

    def create_user_proxy_agent(
        self,
        name: str = "User_proxy",
        system_message: str = "A human admin.",
        human_input_mode: str = "NEVER",
        **kwargs: Any,
    ) -> UserProxyAgent:
        """UserProxyAgentを作成します"""
        user_proxy_config = {
            "name": name,
            "system_message": system_message,
            "human_input_mode": human_input_mode,
            "code_execution_config": False,
            "max_consecutive_auto_reply": 0,
            "is_termination_msg": lambda msg: "TERMINATE" in msg["content"],
            **kwargs,
        }
        return UserProxyAgent(**user_proxy_config)

    def create_group_chat(
        self, agents: list[ConversableAgent], max_round: int = 10, **kwargs: Any
    ) -> GroupChat:
        """GroupChatを作成します"""
        return GroupChat(agents=agents, messages=[], max_round=max_round, **kwargs)

    def create_group_chat_manager(
        self,
        groupchat: GroupChat,
        llm_config: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> GroupChatManager:
        """GroupChatManagerを作成します"""
        manager_config = {
            "groupchat": groupchat,
            "llm_config": llm_config or {"config_list": self.config_list},
            **kwargs,
        }
        return GroupChatManager(**manager_config)


class TestModel(BaseModel):
    summary: Annotated[str, Field(description="The summury of conversatio.")]
    detail: Annotated[str, Field(description="Detail")]


def summary(sumury_model: TestModel) -> TestModel:
    return sumury_model


if __name__ == "__main__":
    # AgentGatewayのインスタンスを作成
    agent_gateway = AgentGateway()

    # UserProxyAgentを作成
    user_proxy = agent_gateway.create_user_proxy_agent()

    # エージェントを作成
    agent_a = agent_gateway.create_agent(
        name="John",
        system_message="あなたはお菓子メーカーであるA社の販売スタッフです。",
        description="お菓子メーカーであるA社の販売スタッフの立場から意見します。",
    )
    agent_b = agent_gateway.create_agent(
        name="Kate",
        system_message="あなたはお菓子メーカーであるA社の商品企画スタッフです。",
        description="お菓子メーカーであるA社の商品企画スタッフの立場から意見します。",
    )
    user_proxy.register_for_execution(name="summary")(summary)
    agent_a.register_for_llm(name="summary", description="discussion summary")(summary)
    agent_b.register_for_llm(name="summary", description="discussion summary")(summary)
    # GroupChatを作成
    agents = [user_proxy, agent_a, agent_b]
    groupchat = agent_gateway.create_group_chat(agents, max_round=5)

    # GroupChatManagerを作成
    manager = agent_gateway.create_group_chat_manager(groupchat)

    # チャットを開始
    user_proxy.initiate_chat(
        manager,
        message="春の新商品の企画について会議します。日本語で会話してください。販売スタッフの現場の声を反映しつつ、今年の商品として何を売り出すか議論し結論を出してください。最後に議論のサマリーを出力してください。",
    )

    print(groupchat.messages[-1])
