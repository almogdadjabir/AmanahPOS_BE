"""
BudgetSMS.net SMS provider for AmanaPOS.

API: GET https://api.budgetsms.net/sendsms/
Required env vars:
  BUDGETSMS_USERNAME, BUDGETSMS_USERID, BUDGETSMS_HANDLE
Optional:
  BUDGETSMS_SENDER_ID (default: AmanaPOS)
"""
import logging
import re
import urllib.parse
import urllib.request
from dataclasses import dataclass

from django.conf import settings

logger = logging.getLogger(__name__)

_BUDGETSMS_URL = "https://api.budgetsms.net/sendsms/"

_ERROR_CODES: dict[str, str] = {
    "101": "Authentication failed — check BUDGETSMS_USERNAME / USERID / HANDLE",
    "102": "Invalid sender ID",
    "103": "Invalid destination number",
    "104": "Insufficient credits",
    "105": "Message too long",
    "106": "Blocked by carrier",
    "107": "Internal BudgetSMS error",
    "3001": "Invalid or unroutable destination number — verify the phone number is correct",
    "3002": "Destination number blocked by operator",
    "3003": "Message delivery failed",
}


class BudgetSmsError(Exception):
    def __init__(self, code: str, detail: str) -> None:
        self.code = code
        self.detail = detail
        super().__init__(f"BudgetSMS ERR {code}: {detail}")


@dataclass
class SmsSendResult:
    success: bool
    message_id: str = ""
    raw: str = ""


def _mask(phone: str) -> str:
    return phone[:4] + "****" + phone[-3:] if len(phone) > 7 else phone


class BudgetSmsProvider:
    """Send SMS messages via BudgetSMS.net GET API."""

    def __init__(self) -> None:
        self.username: str = getattr(settings, "BUDGETSMS_USERNAME", "")
        self.userid: str = getattr(settings, "BUDGETSMS_USERID", "")
        self.handle: str = getattr(settings, "BUDGETSMS_HANDLE", "")
        self.sender_id: str = getattr(settings, "BUDGETSMS_SENDER_ID", "AmanaPOS")

    def _normalize_phone(self, phone: str) -> str:
        """Strip + and all non-digit chars → '249912300001'."""
        return re.sub(r"[^\d]", "", phone)

    def send(self, to: str, message: str) -> SmsSendResult:
        to_normalized = self._normalize_phone(to)
        params = urllib.parse.urlencode({
            "username": self.username,
            "userid": self.userid,
            "handle": self.handle,
            "from": self.sender_id,
            "to": to_normalized,
            "msg": message,
        })
        url = f"{_BUDGETSMS_URL}?{params}"

        try:
            with urllib.request.urlopen(url, timeout=10) as resp:
                raw = resp.read().decode("utf-8").strip()
        except Exception as exc:
            logger.exception("BudgetSMS network error to %s", _mask(to))
            raise BudgetSmsError("NETWORK", str(exc)) from exc

        if raw.startswith("OK"):
            msg_id = raw.split(" ", 1)[1] if " " in raw else ""
            logger.info("BudgetSMS sent to %s msg_id=%s", _mask(to), msg_id)
            return SmsSendResult(success=True, message_id=msg_id, raw=raw)

        if raw.startswith("ERR"):
            parts = raw.split(" ", 2)
            code = parts[1] if len(parts) > 1 else "?"
            detail = _ERROR_CODES.get(code, parts[2] if len(parts) > 2 else raw)
            logger.error("BudgetSMS rejected message to %s: %s", _mask(to), raw)
            raise BudgetSmsError(code, detail)

        logger.error("BudgetSMS unexpected response to %s: %s", _mask(to), raw)
        raise BudgetSmsError("UNKNOWN", raw)
