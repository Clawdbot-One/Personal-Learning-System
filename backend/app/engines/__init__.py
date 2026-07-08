"""Five learning methodology engines.

Each engine translates a classic learning-science book into operable software
logic:

- deliberate_practice  -> Anders Ericsson, *Peak* (刻意练习)
- sponge_reading       -> 李小墨, *海绵阅读法*
- deep_work            -> Cal Newport, *Deep Work* (深度工作)
- knowledge_action     -> *Knowing-Doing Gap* / *Know Can Do* (知行转化)
- critical_thinking    -> M. Neil Browne, *Asking the Right Questions* (学会提问)
"""
from .deliberate_practice import DeliberatePracticeEngine
from .sponge_reading import SpongeReadingEngine
from .deep_work import DeepWorkEngine
from .knowledge_action import KnowledgeActionEngine
from .critical_thinking import CriticalThinkingEngine

__all__ = [
    "DeliberatePracticeEngine",
    "SpongeReadingEngine",
    "DeepWorkEngine",
    "KnowledgeActionEngine",
    "CriticalThinkingEngine",
]
