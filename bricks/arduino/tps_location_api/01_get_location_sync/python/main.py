import time
import uuid
import logging

from arduino.app_utils import App
from arduino.app_bricks.tps_location_api import TPSLocationAPI

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s.%(msecs)03d %(levelname)s - [%(threadName)s] %(name)s:  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("TPSLocationAPI")


loc_api = TPSLocationAPI()
device_id = "14:b5:cd:e8:7d:43"  # MAC Address

def log_location(result, error, mode="sync"):
    """Log location result or error."""
    if error:
        logger.error(f"[{mode}] Locate failed: {error}")
        return
    
    loc = result.get("location", {})
    response_token = result.get("request_token", "N/A")
    elapsed_ms = result.get("elapsed_ms", "?")
    logger.info(f"[{mode}] Location: lat={loc.get('lat')}, lng={loc.get('lng')} | "
                f"Accuracy: {result.get('accuracy')}m | "
                f"APs used: {result.get('nap')} | "
                f"Token: {response_token} | "
                f"Elapsed: {elapsed_ms}ms")


# --- Sync version (blocking) ---

def loop_sync():
    """Blocking version: waits for locate() to complete before continuing."""
    request_token = str(uuid.uuid4())
    start_ms = time.time() * 1000
    try:
        result = loc_api.locate(
            request_token=request_token,
            street_address=True,
            device_id=device_id,
            opt_in=True
        )
        
        result["elapsed_ms"] = int(time.time() * 1000 - start_ms)
        log_location(result, None, mode="sync")
    except RuntimeError as e:
        log_location(None, e, mode="sync")

    time.sleep(30)


App.run(user_loop=loop_sync)
