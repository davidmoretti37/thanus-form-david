import os
import sentry_sdk

# Guard optional Dramatiq integration to avoid import errors when the extra isn't installed
integrations = []
try:
    from sentry_sdk.integrations.dramatiq import DramatiqIntegration  # type: ignore
    integrations.append(DramatiqIntegration())
except Exception:
    # Dramatiq extra not available; proceed without it
    pass

sentry_dsn = os.getenv("SENTRY_DSN")
if sentry_dsn:
    sentry_sdk.init(
        dsn=sentry_dsn,
        integrations=integrations,
        traces_sample_rate=0.1,
        send_default_pii=True,
        _experiments={"enable_logs": True},
    )

sentry = sentry_sdk
