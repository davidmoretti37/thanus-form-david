from __future__ import annotations

from typing import Any, Callable, List

# Compatibility layer for different agno versions or absence of Agent export.
# Attempts several import paths; falls back to a minimal compatible stub.

AgnoAgent = None  # type: ignore


def _try_import() -> Any:
    # Try common locations where Agent might live in different agno versions.
    try:
        from agno import Agent as _AgnoAgent  # type: ignore
        return _AgnoAgent
    except Exception:
        pass
    try:
        from agno.agent import Agent as _AgnoAgent  # type: ignore
        return _AgnoAgent
    except Exception:
        pass
    try:
        from agno.core import Agent as _AgnoAgent  # type: ignore
        return _AgnoAgent
    except Exception:
        pass
    return None


_Agent = _try_import()


if _Agent is not None:
    AgnoAgent = _Agent
else:
    class CompatAgent:
        """
        Minimal local stub mimicking the interface used in our codebase:
        - constructor (name, llm, system_message, tools, **kwargs)
        - run(prompt) method calling the provided llm callable if available
        - llm attribute kept for fallback usage
        """
        def __init__(
            self,
            name: str,
            llm: Callable[[str], str] | Any,
            system_message: str = "",
            tools: List[Any] | None = None,
            **kwargs: Any,
        ) -> None:
            self.name = name
            self.llm = llm
            self.system_message = system_message
            self.tools = tools or []
            self.extra = kwargs

        def run(self, prompt: str) -> str:
            if callable(self.llm):
                return str(self.llm(prompt))
            return str(prompt)

    AgnoAgent = CompatAgent  # type: ignore

__all__ = ["AgnoAgent"]
