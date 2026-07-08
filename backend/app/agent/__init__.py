"""AI Agent integration layer.

Implements a Manager-Workers style multi-agent system (per the PRD's HiClaw
inspired architecture). A single entry point routes a user message to the
appropriate specialist agent role:

- planner  : 学习规划师 (HiClaw Manager) — strategy & task scheduling
- reading  : 阅读导师 (海绵阅读法)
- practice : 练习导师 (刻意练习)
- focus    : 专注导师 (深度工作)
- thinking : 思维导师 (批判性思维)
- action   : 行动导师 (知行转化)

Backend selection (settings.agent_backend):
- auto : use LLM if a key is configured, else the rule engine
- rule : deterministic, always-available methodology engine
- llm  : OpenAI-compatible chat completions (works with Hermes / OpenClaw /
         HiClaw gateways that expose an OpenAI-style endpoint)
- hermes | openclaw | hiclaw : same OpenAI-compatible client, labelled backend
"""
from .manager import AgentManager

__all__ = ["AgentManager"]
