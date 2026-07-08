"""OpenAI-compatible LLM adapter.

Works with any chat-completions endpoint that follows the OpenAI schema. This
includes self-hosted Hermes Agent, OpenClaw gateways and HiClaw worker
endpoints — all of which expose an OpenAI-style `/v1/chat/completions` route.
"""
from __future__ import annotations

from typing import Any, Optional

import httpx

from ..config import settings


# System prompts that inject the methodology persona per role.
ROLE_SYSTEM_PROMPTS = {
    "planner": (
        "你是 LearnFlow 的『学习规划师』Agent（对应 HiClaw Manager 角色）。"
        "你精通目标拆解、SMART 原则、里程碑规划与精力管理。"
        "回答简洁、可执行，必要时给出编号步骤。引用《刻意练习》《深度工作》的方法论。"
    ),
    "reading": (
        "你是『阅读导师』Agent，精通李小墨《海绵阅读法》。"
        "擅长三层笔记（片段/章节/全书）、阅读七大能力、四阶段进阶与读书报告输出。"
    ),
    "practice": (
        "你是『练习导师』Agent，精通 Anders Ericsson《刻意练习》(Peak)。"
        "你使用 SM-2 间隔重复与 IRT 自适应难度，把训练锚定在学习区，提供即时反馈与根因诊断。"
    ),
    "focus": (
        "你是『专注导师』Agent，精通 Cal Newport《深度工作》。"
        "你保护用户免受注意力残留，提供四种深度工作策略、启动仪式与时间块规划。"
    ),
    "thinking": (
        "你是『思维导师』Agent，精通 M. Neil Browne《学会提问》。"
        "你以淘金式思维引导用户完成 11 步批判性分析、识别逻辑谬误、评估证据等级。"
    ),
    "action": (
        "你是『行动导师』Agent，精通《知行差距》与费曼学习法。"
        "你帮用户用少而精、绿灯思维、间隔跟进与教授他人，把知识转化为行动。"
    ),
}


class LLMAdapter:
    """Thin OpenAI-compatible client."""

    @staticmethod
    def is_available() -> bool:
        return bool(settings.llm_api_key)

    @staticmethod
    async def chat(
        role: str,
        message: str,
        history: list[dict[str, str]] | None = None,
        context: str = "",
    ) -> tuple[str, dict[str, Any]]:
        """Return (content, metadata). Raises on failure so caller can fall back."""
        if not LLMAdapter.is_available():
            raise RuntimeError("LLM 未配置")

        system = ROLE_SYSTEM_PROMPTS.get(role, ROLE_SYSTEM_PROMPTS["planner"])
        if context:
            system = system + "\n\n用户当前学习画像（供个性化参考）：\n" + context

        messages: list[dict[str, str]] = [{"role": "system", "content": system}]
        for h in history or []:
            messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": message})

        base_url = (settings.llm_base_url or "https://api.openai.com/v1").rstrip("/")
        url = f"{base_url}/chat/completions"
        headers = {"Authorization": f"Bearer {settings.llm_api_key}", "Content-Type": "application/json"}
        payload = {
            "model": settings.llm_model,
            "messages": messages,
            "temperature": 0.6,
            "max_tokens": 900,
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()

        content = data["choices"][0]["message"]["content"]
        meta = {
            "model": data.get("model", settings.llm_model),
            "usage": data.get("usage", {}),
            "finish_reason": data["choices"][0].get("finish_reason"),
        }
        return content, meta
