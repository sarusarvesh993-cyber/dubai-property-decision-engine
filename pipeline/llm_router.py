"""Self-adapting FREE-model LLM router.

Design goals (from the project brief):
  * Use only free-tier APIs.
  * When a free model is retired / rate-limited / errors, move on automatically.
  * When NEW free models appear, pick them up automatically (live discovery, no code change).
  * Never break the product: callers catch `LLMUnavailable` and use a rules-based fallback.

How it works
------------
1. Discovery  — every provider exposes an OpenAI-compatible `/models` endpoint. OpenRouter
   additionally publishes pricing, modalities and `expiration_date`, so we can filter to
   free, text-in/text-out, non-expired chat models without any hard-coded list.
2. Ranking    — a transparent heuristic score (model family, parameter count, context
   length, penalties for special-purpose models). Env var LLM_MODEL can pin a favourite.
3. Execution  — try candidates in order; classify failures:
      401/403          -> provider key invalid: skip provider for this run
      404 / bad model  -> model retired: blacklist 24h
      429              -> rate limited: cool down 5 min
      5xx / timeouts   -> transient: cool down 2 min
4. Memory     — discovered models + blacklist persisted to data/llm_cache/models.json
   (TTL configurable) so restarts don't hammer the /models endpoints.

Everything is plain `requests`; no vendor SDK lock-in.
"""
from __future__ import annotations

import json
import os
import re
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

import requests

try:  # optional: load .env if present
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
except Exception:  # pragma: no cover
    pass

DEFAULT_CACHE = Path(__file__).resolve().parents[1] / "data" / "llm_cache" / "models.json"

PROVIDERS: dict[str, dict[str, Any]] = {
    "groq": {"base_url": "https://api.groq.com/openai/v1", "key_env": "GROQ_API_KEY", "needs_key_to_list": True},
    "gemini": {"base_url": "https://generativelanguage.googleapis.com/v1beta/openai", "key_env": "GEMINI_API_KEY", "needs_key_to_list": True},
    "cerebras": {"base_url": "https://api.cerebras.ai/v1", "key_env": "CEREBRAS_API_KEY", "needs_key_to_list": True},
    "openrouter": {"base_url": "https://openrouter.ai/api/v1", "key_env": "OPENROUTER_API_KEY", "needs_key_to_list": False,
                   "extra_headers": {"HTTP-Referer": "https://github.com/dubai-property-decision-engine",
                                     "X-Title": "Dubai Property Decision Engine"}},
}
DEFAULT_ORDER = ["groq", "gemini", "cerebras", "openrouter"]

# Words that mark a model as unsuitable for general chat/JSON tasks.
EXCLUDE_PATTERNS = re.compile(
    r"(safety|guard|moderat|embed|whisper|tts|speech|audio|lyria|image|vision-only|ocr|rerank|"
    r"transcri|native-audio|live|veo|imagen|aqa|learnlm|robotics|computer-use|-code|coder)", re.I)
GOOD_FAMILIES = ("llama", "qwen", "gemma", "mistral", "mixtral", "deepseek", "nemotron", "gpt-oss",
                 "glm", "kimi", "gemini", "command", "phi", "hermes", "openchat", "yi-")


@dataclass
class Candidate:
    provider: str
    model: str
    context_length: int = 0
    score: float = 0.0

    @property
    def key(self) -> str:
        return f"{self.provider}:{self.model}"


@dataclass
class LLMResponse:
    text: str
    provider: str
    model: str
    latency_s: float
    attempts: list[str] = field(default_factory=list)

    @property
    def label(self) -> str:
        return f"{self.provider} · {self.model} · {self.latency_s:.1f}s"


class LLMUnavailable(RuntimeError):
    """Raised when every provider/model failed (or no keys configured)."""


def _size_billion(model_id: str) -> float:
    """Parse the largest 'NNb' parameter hint from a model id (e.g. 'llama-3.3-70b' -> 70)."""
    sizes = [float(x) for x in re.findall(r"(\d+(?:\.\d+)?)b(?![a-z])", model_id.lower())]
    return max(sizes) if sizes else 0.0


def score_model(provider: str, model_id: str, ctx: int) -> float:
    mid = model_id.lower()
    if model_id == "openrouter/free":
        return 1.0  # meta-router: last resort, still better than nothing
    if EXCLUDE_PATTERNS.search(mid):
        return -100.0
    s = 0.0
    s += 30 if any(f in mid for f in GOOD_FAMILIES) else 0
    s += min(_size_billion(mid), 120) / 4          # up to +30 for big models
    s += min(ctx or 0, 131_072) / 131_072 * 10     # up to +10 for long context
    s += 5 if re.search(r"(instruct|-it\b|chat|versatile)", mid) else 0
    s -= 10 if re.search(r"(nano|mini|tiny|lite|small|1b|2b|3b)", mid) else 0
    s -= 3 if re.search(r"(preview|exp|alpha|beta)", mid) else 0
    if provider == "gemini":
        s += 12 if "flash" in mid else 0           # best free-tier quota
        s -= 15 if "pro" in mid else 0             # tiny free quota
        s -= 5 if re.search(r"gemini-1\.", mid) else 0
    if provider == "groq":
        s += 8 if "versatile" in mid or "70b" in mid or "120b" in mid else 0
    return s


class FreeModelRouter:
    def __init__(self, cache_path: Path = DEFAULT_CACHE, ttl_hours: float | None = None,
                 timeout: int = 60, max_models_per_provider: int = 4):
        self.cache_path = Path(cache_path)
        self.ttl = float(ttl_hours if ttl_hours is not None else os.getenv("LLM_CACHE_TTL_HOURS", "6")) * 3600
        self.timeout = timeout
        self.max_models = max_models_per_provider
        self._cache = self._load_cache()
        self.last_attempts: list[str] = []

    # ------------------------------------------------------------------ cache
    def _load_cache(self) -> dict:
        if self.cache_path.exists():
            try:
                return json.loads(self.cache_path.read_text(encoding="utf-8"))
            except Exception:
                pass
        return {"discovered_at": 0, "candidates": [], "blacklist": {}}

    def _save_cache(self) -> None:
        self.cache_path.parent.mkdir(parents=True, exist_ok=True)
        self.cache_path.write_text(json.dumps(self._cache, indent=2), encoding="utf-8")

    def _blacklisted(self, key: str) -> bool:
        until = self._cache["blacklist"].get(key)
        return bool(until and until > time.time())

    def _blacklist(self, key: str, seconds: int, reason: str) -> None:
        self._cache["blacklist"][key] = time.time() + seconds
        self._cache.setdefault("blacklist_reasons", {})[key] = f"{reason} @ {time.strftime('%Y-%m-%d %H:%M')}"
        self._save_cache()

    # --------------------------------------------------------------- providers
    @staticmethod
    def key_for(provider: str) -> str | None:
        return os.getenv(PROVIDERS[provider]["key_env"]) or None

    def provider_order(self) -> list[str]:
        env = os.getenv("LLM_PROVIDER_ORDER")
        order = [p.strip() for p in env.split(",") if p.strip() in PROVIDERS] if env else DEFAULT_ORDER
        return [p for p in order if self.key_for(p)]

    def _headers(self, provider: str) -> dict:
        h = {"Content-Type": "application/json"}
        key = self.key_for(provider)
        if key:
            h["Authorization"] = f"Bearer {key}"
        h.update(PROVIDERS[provider].get("extra_headers", {}))
        return h

    # --------------------------------------------------------------- discovery
    def _discover_provider(self, provider: str) -> list[Candidate]:
        cfg = PROVIDERS[provider]
        if cfg["needs_key_to_list"] and not self.key_for(provider):
            return []
        try:
            r = requests.get(f"{cfg['base_url']}/models", headers=self._headers(provider), timeout=20)
            r.raise_for_status()
            data = r.json().get("data", [])
        except Exception:
            return []
        out: list[Candidate] = []
        for m in data:
            mid = str(m.get("id", ""))
            if provider == "openrouter":
                pr = m.get("pricing", {}) or {}
                free = str(pr.get("prompt", "1")) in ("0", "0.0") and str(pr.get("completion", "1")) in ("0", "0.0")
                arch = m.get("architecture", {}) or {}
                textual = "text" in (arch.get("input_modalities") or ["text"]) and \
                          "text" in (arch.get("output_modalities") or ["text"])
                exp = m.get("expiration_date")
                expired = bool(exp) and str(exp)[:10] < time.strftime("%Y-%m-%d")
                if not (free and textual and not expired):
                    continue
                ctx = int(m.get("context_length") or 0)
            else:
                if provider == "gemini":
                    mid = mid.replace("models/", "")
                ctx = int(m.get("context_window") or m.get("context_length") or 0)
            sc = score_model(provider, mid, ctx)
            if sc > -50:
                out.append(Candidate(provider, mid, ctx, sc))
        out.sort(key=lambda c: -c.score)
        return out

    def discover(self, force: bool = False) -> list[Candidate]:
        fresh = time.time() - self._cache.get("discovered_at", 0) < self.ttl
        if not force and fresh and self._cache.get("candidates"):
            cands = [Candidate(**c) for c in self._cache["candidates"]]
        else:
            cands = []
            for p in PROVIDERS:
                cands.extend(self._discover_provider(p))
            self._cache["candidates"] = [asdict(c) for c in cands]
            self._cache["discovered_at"] = time.time()
            self._save_cache()
        return cands

    def candidates(self) -> list[Candidate]:
        """Ordered execution list: pinned model first, then per-provider top-N in provider order."""
        cands = self.discover()
        ordered: list[Candidate] = []
        pin = os.getenv("LLM_MODEL")
        if pin and ":" in pin:
            p, m = pin.split(":", 1)
            if p in PROVIDERS and self.key_for(p):
                ordered.append(Candidate(p, m, 0, 999))
        for p in self.provider_order():
            top = [c for c in cands if c.provider == p and not self._blacklisted(c.key)][: self.max_models]
            ordered.extend(top)
            if p == "openrouter" and not any(c.model == "openrouter/free" for c in top):
                ordered.append(Candidate("openrouter", "openrouter/free", 0, 1))
        # de-dupe preserving order
        seen, final = set(), []
        for c in ordered:
            if c.key not in seen:
                seen.add(c.key); final.append(c)
        return final

    # --------------------------------------------------------------- execution
    def chat(self, messages: list[dict], temperature: float = 0.2, max_tokens: int = 1200,
             json_mode: bool = False) -> LLMResponse:
        if os.getenv("LLM_DISABLE") == "1":
            raise LLMUnavailable("LLM disabled via LLM_DISABLE=1")
        cands = self.candidates()
        if not cands:
            raise LLMUnavailable("No LLM API keys configured (set GROQ_API_KEY / GEMINI_API_KEY / OPENROUTER_API_KEY / CEREBRAS_API_KEY)")
        attempts: list[str] = []
        dead_providers: set[str] = set()
        for c in cands:
            if c.provider in dead_providers:
                continue
            body: dict[str, Any] = {"model": c.model, "messages": messages,
                                    "temperature": temperature, "max_tokens": max_tokens}
            if json_mode:
                body["response_format"] = {"type": "json_object"}
            t0 = time.time()
            try:
                r = requests.post(f"{PROVIDERS[c.provider]['base_url']}/chat/completions",
                                  headers=self._headers(c.provider), json=body, timeout=self.timeout)
            except requests.RequestException as e:
                attempts.append(f"{c.key}: network error ({type(e).__name__})")
                self._blacklist(c.key, 120, "network error")
                continue
            if r.status_code == 200:
                try:
                    text = r.json()["choices"][0]["message"]["content"] or ""
                except Exception:
                    attempts.append(f"{c.key}: malformed response")
                    continue
                if not text.strip():
                    attempts.append(f"{c.key}: empty response")
                    continue
                self.last_attempts = attempts
                return LLMResponse(text, c.provider, c.model, time.time() - t0, attempts)
            snippet = r.text[:160].replace("\n", " ")
            if r.status_code in (401, 403):
                attempts.append(f"{c.key}: auth failed ({r.status_code}) -> skipping provider")
                dead_providers.add(c.provider)
            elif r.status_code == 429:
                attempts.append(f"{c.key}: rate limited -> cooldown 5 min")
                self._blacklist(c.key, 300, "429 rate limit")
            elif r.status_code in (404, 400, 422) and re.search(r"model|not found|does not exist|deprecat|decommission", snippet, re.I):
                attempts.append(f"{c.key}: model unavailable ({r.status_code}) -> blacklisted 24h")
                self._blacklist(c.key, 86_400, f"{r.status_code} {snippet[:60]}")
            elif r.status_code == 400 and json_mode:
                # Some free models reject response_format; retry once without it.
                body.pop("response_format", None)
                r2 = requests.post(f"{PROVIDERS[c.provider]['base_url']}/chat/completions",
                                   headers=self._headers(c.provider), json=body, timeout=self.timeout)
                if r2.status_code == 200:
                    text = r2.json()["choices"][0]["message"]["content"] or ""
                    if text.strip():
                        self.last_attempts = attempts
                        return LLMResponse(text, c.provider, c.model, time.time() - t0, attempts)
                attempts.append(f"{c.key}: 400 even without json_mode")
                self._blacklist(c.key, 600, "400 bad request")
            else:
                attempts.append(f"{c.key}: HTTP {r.status_code} -> cooldown 2 min")
                self._blacklist(c.key, 120, f"HTTP {r.status_code}")
        self.last_attempts = attempts
        raise LLMUnavailable("All candidates failed:\n  " + "\n  ".join(attempts))

    # ------------------------------------------------------------------ status
    def status(self) -> dict:
        cands = self.discover()
        return {
            "providers_with_keys": self.provider_order(),
            "discovered_free_models": {p: sum(1 for c in cands if c.provider == p) for p in PROVIDERS},
            "execution_order": [f"{c.key} (score {c.score:.0f})" for c in self.candidates()[:8]],
            "blacklisted": {k: self._cache.get("blacklist_reasons", {}).get(k, "") for k, until in
                            self._cache["blacklist"].items() if until > time.time()},
            "cache_age_min": round((time.time() - self._cache.get("discovered_at", 0)) / 60, 1),
        }


def extract_json(text: str) -> dict | None:
    """Robustly pull the first JSON object out of an LLM reply (handles ```json fences)."""
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.M).strip()
    try:
        return json.loads(text)
    except Exception:
        pass
    m = re.search(r"\{.*\}", text, re.S)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            return None
    return None


_router: FreeModelRouter | None = None


def get_router() -> FreeModelRouter:
    global _router
    if _router is None:
        _router = FreeModelRouter()
    return _router
